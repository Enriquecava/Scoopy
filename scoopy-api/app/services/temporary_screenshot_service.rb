class TemporaryScreenshotService
  DIRECTORY = Rails.root.parent.join("scraper/tmp/screenshot")
  TTL = 1.hour

  def self.cleanup_expired
    return unless DIRECTORY.exist?

    Dir.glob(DIRECTORY.join("*.png")).each do |file_path|
      File.delete(file_path) if File.mtime(file_path) < TTL.ago
    rescue Errno::ENOENT
      next
    end
  end
end