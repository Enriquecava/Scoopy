class CleanupTemporaryScreenshotsJob < ApplicationJob
  queue_as :default

  TTL = 1.hour

  def perform
    directory = Rails.root.parent.join("scraper/tmp/screenshot")
    return unless directory.exist?

    Dir.glob(directory.join("*.png")).each do |file_path|
      File.delete(file_path) if File.mtime(file_path) < TTL.ago
    rescue Errno::ENOENT
      next
    end
  end
end
