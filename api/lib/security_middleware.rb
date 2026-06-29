require "json"
require "rack/request"
require "rack/utils"
require_relative "logger"

module Api
  class SecurityMiddleware
    MAX_BODY_SIZE = 1_048_576
    MAX_REQUESTS_PER_MINUTE = 120
    RATE_LIMIT_WINDOW = 60

    ALLOWED_ORIGINS = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:9292",
      "http://127.0.0.1:9292",
      "http://127.0.0.1:4567",
      "http://127.0.0.1:8000",
      # "https://frontend.com"
    ].freeze

    SWAGGER_PATH_PREFIXES = [
      "/swagger",
      "/api-docs",
      "/docs"
    ].freeze

    def initialize(app)
      @app = app
      @requests = Hash.new { |hash, key| hash[key] = [] }
      @mutex = Mutex.new
    end

    def call(env)
      request = Rack::Request.new(env)
      remote_ip = request.ip || "unknown"
      path = request.path.to_s
      method = request.request_method
      origin = env["HTTP_ORIGIN"]
      content_length = normalized_content_length(env)

      swagger_request = swagger_path?(path)
      count = track_request(remote_ip)

      Api::AppLogger.info(event:"middleware_request", message:"Processing request", 
        ip: remote_ip,
        path: path,
        method: method,
        content_length: content_length,
        request_count: count,
        origin: origin,
        swagger_request: swagger_request,
        request_id: env["request_id"],
        service: "middleware"
      )

      if request.options?
        return [204, preflight_headers(origin), []]
      end

      if count > MAX_REQUESTS_PER_MINUTE
        Api::AppLogger.warn(event:"rate_limit", message:"Too many requests",
          ip: remote_ip,
          path: path,
          method: method,
          request_id: env["request_id"],
          service: "middleware"
        )
        return json_response(429, { error: "Rate limit exceeded" }, origin)
      end

      if content_length > MAX_BODY_SIZE
        Api::AppLogger.warn(event:"payload_too_large", message:"Request payload exceeds size limit",
          ip: remote_ip,
          path: path,
          method: method,
          size: content_length,
          request_id: env["request_id"],
          service: "middleware"
        )
        return json_response(413, { error: "Payload too large" }, origin)
      end

      unless swagger_request || safe_path?(path)
        Api::AppLogger.warn(event:"invalid_path", message:"Suspicious path detected",
          ip: remote_ip,
          path: path,
          method: method,
          request_id: env["request_id"],
          service: "middleware"
        )
        return json_response(400, { error: "Invalid request path" }, origin)
      end

      status, headers, body = @app.call(env)
      headers = normalize_headers(headers)
      headers = headers.merge(cors_headers(origin, path))

      Api::AppLogger.info(event:"middleware_response", message:"Request completed", 
        ip: remote_ip,
        path: path,
        method: method,
        status: status,
        content_type: headers["Content-Type"],
        request_id: env["request_id"],
        service: "middleware"
      )

      [status, headers, body]
    rescue StandardError => e
      Api::AppLogger.error(event:"middleware_exception", message:"Unhandled exception in middleware", 
        ip: remote_ip,
        path: path,
        method: method,
        error_class: e.class.name,
        error_message: e.message,
        request_id: env["request_id"], 
        service: "middleware"
      )

      json_response(500, { error: "Internal server error" }, origin)
    end

    private

    def normalized_content_length(env)
      raw = env["CONTENT_LENGTH"].to_s.strip
      return 0 if raw.empty?
      return raw.to_i if raw.match?(/\A\d+\z/)

      0
    end

    def track_request(remote_ip)
      now = Time.now.to_i

      @mutex.synchronize do
        @requests[remote_ip].select! { |ts| ts > now - RATE_LIMIT_WINDOW }
        @requests[remote_ip] << now
        @requests[remote_ip].length
      end
    end

    def swagger_path?(path)
      SWAGGER_PATH_PREFIXES.any? { |prefix| path.start_with?(prefix) }
    end

    def safe_path?(path)
      return false if path.empty?
      return false unless path.start_with?("/")

      decoded = Rack::Utils.unescape_path(path) rescue path

      forbidden_patterns = [
        /\.\./,
        /\0/,
        /[\r\n]/
      ]

      forbidden_patterns.none? { |pattern| decoded.match?(pattern) }
    end

    def normalize_headers(headers)
      normalized = {}

      headers.to_h.each do |key, value|
        normalized[key.to_s] = value.to_s
      end

      normalized
    end

    def cors_headers(origin, path = nil)
      headers = {
        "Vary" => "Origin"
      }

      if origin && allowed_origin?(origin)
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
      elsif swagger_path?(path.to_s)
        headers["Access-Control-Allow-Origin"] = "*"
      end

      headers
    end

    def preflight_headers(origin)
      headers = {
        "Access-Control-Allow-Methods" => "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers" => "Content-Type, Authorization",
        "Access-Control-Max-Age" => "86400",
        "Vary" => "Origin"
      }

      if origin && allowed_origin?(origin)
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
      else
        headers["Access-Control-Allow-Origin"] = "*"
      end

      headers
    end

    def allowed_origin?(origin)
      ALLOWED_ORIGINS.include?(origin)
    end

    def json_response(status, payload, origin)
      [
        status,
        normalize_headers(
          cors_headers(origin).merge("Content-Type" => "application/json")
        ),
        [JSON.generate(payload)]
      ]
    end
  end
end