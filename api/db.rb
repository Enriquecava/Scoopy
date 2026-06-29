require "pg"
require "dotenv"
require_relative "lib/logger"

class DatabaseConnection
  def self.connect
    load_environment!

    host = ENV.fetch("PGHOST")
    host = "127.0.0.1" if host == "localhost" || host == "::1"

    PG.connect(
      host: host,
      port: Integer(ENV.fetch("PGPORT")),
      dbname: ENV.fetch("PGDATABASE"),
      user: ENV.fetch("PGUSER"),
      password: ENV.fetch("PGPASSWORD")
    )
  rescue PG::ConnectionBad => e
    raise PG::ConnectionBad, "Unable to connect to PostgreSQL at #{host}:#{ENV.fetch("PGPORT")}: #{e.message}"
  end

  def self.set_user_context(connection, user_info)
    nickname = connection.escape_string(user_info[:nickname])
    connection.exec("SET app.authenticated_user = '#{nickname}'")
    Api::AppLogger.info(event: "database_context_set", message: "RLS context set for user", user: user_info[:nickname], service:"DataBase")
  end

  def self.clear_user_context(connection)
    connection.exec("RESET app.authenticated_user")
    Api::AppLogger.info(event: "database_context_cleared", message: "RLS context cleared", service:"DataBase")
  end

  def self.load_environment!
    env_file = File.expand_path("../.env", __dir__)
    Dotenv.load(env_file) if File.exist?(env_file)
  end
  private_class_method :load_environment!
end

DB = DatabaseConnection.connect
