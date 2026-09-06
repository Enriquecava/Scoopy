namespace :solid_queue do
  desc "Prepare the Solid Queue schema for the configured queue database"
  task prepare: :environment do
    queue_config = ActiveRecord::Base.configurations.find_db_config("#{Rails.env}.queue") ||
      ActiveRecord::Base.configurations.find_db_config("queue")

    abort "Solid Queue queue database configuration is missing" unless queue_config

    unless SolidQueue::Record.connection.data_source_exists?("solid_queue_jobs")
      ActiveRecord::Tasks::DatabaseTasks.load_schema(
        queue_config,
        :ruby,
        Rails.root.join("db/queue_schema.rb")
      )
    end
  end
end
