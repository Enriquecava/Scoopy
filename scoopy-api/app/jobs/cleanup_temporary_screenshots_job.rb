class CleanupTemporaryScreenshotsJob < ApplicationJob
  queue_as :default

  def perform
    TemporaryScreenshotService.cleanup_expired
  end
end
