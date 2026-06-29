require "sinatra"
require "json"
require_relative "db"
require_relative "lib/logger"
require_relative "lib/security_middleware"
require_relative "lib/swagger_docs"
require_relative "routes/products"

configure do
  set :port, ENV.fetch("PORT", 4567)
  set :show_exceptions, false
end

use Api::SecurityMiddleware

before do
  response.headers["Access-Control-Allow-Origin"] = "*"
  response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
  response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
  response.headers["Access-Control-Allow-Credentials"] = "true"
  response.headers["Vary"] = "Origin"

  Api::AppLogger.info(event: "request_received", message: "Incoming request",
    method: request.request_method,
    path: request.path,
    ip: request.ip
  )
end

options "/*" do
  status 200
  {}
end

get "/health" do
  Api::AppLogger.info(event:"health_check", message:"Health endpoint called")
  { status: "ok" }.to_json
end

get "/swagger" do
  content_type "text/html"
  Api::SwaggerDocs.html
end

get "/swagger.json" do
  content_type :json
  Api::SwaggerDocs.spec.to_json
end

use Routes::Products
