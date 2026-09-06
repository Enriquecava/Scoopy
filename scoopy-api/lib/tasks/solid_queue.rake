namespace :solid_queue do
  desc "Prepare the Solid Queue schema for the configured queue database"
  task prepare: :environment do
    environment_configs = ActiveRecord::Base.configurations.configs_for(
      env_name: Rails.env,
      include_hidden: true
    )
    queue_config = environment_configs.find { |config| config.name == "queue" } ||
      environment_configs.find { |config| config.name == "primary" } ||
      ActiveRecord::Base.connection_db_config

    unless SolidQueue::Record.connection.data_source_exists?("solid_queue_jobs")
      ActiveRecord::Tasks::DatabaseTasks.load_schema(
        queue_config,
        :ruby,
        Rails.root.join("db/queue_schema.rb")
      )
    end
  end
end
