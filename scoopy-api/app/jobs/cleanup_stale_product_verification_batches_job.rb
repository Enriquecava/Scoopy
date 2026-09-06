class CleanupStaleProductVerificationBatchesJob < ApplicationJob
  queue_as :default

  PROCESSING_STALE_AFTER = 10.minutes
  PENDING_STALE_AFTER = 30.minutes

  def perform
    fail_stale_batches("processing", PROCESSING_STALE_AFTER)
    fail_stale_batches("pending", PENDING_STALE_AFTER)
  end

  private

  def fail_stale_batches(status, age)
    ProductVerificationBatch.where(status: status).where("updated_at < ?", age.ago).find_each do |batch|
      batch.with_lock do
        next unless batch.public_send("#{status}?")

        now = Time.current
        batch.items.where(status: %w[pending processing]).update_all(
          status: "failed",
          verification_error: "verification_timeout",
          finished_at: now,
          updated_at: now
        )

        items = batch.items.reload
        success_count = items.count(&:completed?)
        batch.update!(
          status: :failed,
          total: items.size,
          success_count: success_count,
          failed_count: items.size - success_count,
          error: "Verification timed out",
          finished_at: now
        )
      end
    end
  end
end
