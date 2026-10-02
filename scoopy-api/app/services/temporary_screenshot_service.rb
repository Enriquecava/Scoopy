class TemporaryScreenshotService
  # SCREENSHOT_DIRECTORY lets this point at a path shared (via a Docker volume)
  # with the scraper's verifier container; defaults to the local sibling-repo layout.
  DIRECTORY = Pathname.new(ENV.fetch("SCREENSHOT_DIRECTORY", Rails.root.parent.join("scraper/tmp/screenshot").to_s))
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