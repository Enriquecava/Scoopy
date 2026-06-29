require "json"
require "logger"
require "socket"
require "fileutils"
require "time"

module Api
  class AppLogger
    class << self
      def info(event:, message:, **context)
        log(:info, event:, message:, **context)
      end

      def warn(event:, message:, **context)
        log(:warn, event:, message:, **context)
      end

      def error(event:, message:, exception: nil, **context)
        log(
          :error,
          event:,
          message:,
          exception:,
          **context
        )
      end

      private

      def log(level, event:, message:, exception: nil, **context)
        payload = base_payload
          .merge(
            level: level.to_s.upcase,
            event: event,
            message: message
          )
          .merge(context)

        if exception
          payload[:exception] = {
            class: exception.class.name,
            message: exception.message,
            backtrace: exception.backtrace&.first(20)
          }
        end

        logger.public_send(level, payload.to_json)
      end

      def logger
        @logger ||= begin
          FileUtils.mkdir_p(File.dirname(log_file))

          Logger.new(
            log_file,
            10,                # conservar 10 archivos
            50 * 1024 * 1024   # rotar a 50MB
          ).tap do |logger|
            logger.level = log_level
            logger.formatter = proc { |_severity, _time, _progname, msg|
              "#{msg}\n"
            }
          end
        end
      end

      def base_payload
        {
          timestamp: Time.now.utc.iso8601(3),
          environment: ENV.fetch("APP_ENV", "development"),
          hostname: Socket.gethostname,
          pid: Process.pid
        }
      end

      def log_level
        Logger.const_get(
          ENV.fetch("LOG_LEVEL", "INFO").upcase
        )
      rescue NameError
        Logger::INFO
      end

      def log_file
        ENV.fetch(
          "LOG_PATH",
          File.expand_path("../log/api.log", __dir__)
        )
      end
    end
  end
end