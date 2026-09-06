class ProductVerificationItemJob < ApplicationJob
  queue_as :verification
  limits_concurrency to: 3, key: ->(_item_id) { "product_verification" }, duration: 5.minutes

  def perform(item_id)
    started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    item = ProductVerificationItem.find(item_id)
    batch = nil
    claimed = false

    batch = item.product_verification_batch
    batch.with_lock do
      item.with_lock do
        next if batch.failed? || !item.pending?

        item.update!(status: :processing, started_at: Time.current)
        batch.update!(status: :processing, started_at: batch.started_at || Time.current)
        claimed = true
      end
    end

    return unless claimed

    result = ProductVerificationService.verify_item(
      "provider_id" => item.provider_id,
      "ssn" => item.ssn
    )

    item.update!(
      status: result[:error].nil? ? :completed : :failed,
      provider_id: result[:provider_id],
      ssn: result[:ssn],
      screenshot: result[:screenshot],
      verification_error: result[:error],
      product_name: result[:product_name],
      finished_at: Time.current
    )
  rescue StandardError => e
    item&.update(
      status: :failed,
      verification_error: "verification_failed",
      finished_at: Time.current
    )
    Rails.logger.error("Product verification job failed for item=#{item_id}: #{e.class}: #{e.message}")
  ensure
    ProductVerificationBatchStatusService.call(batch || item&.product_verification_batch)
    ActiveSupport::Notifications.instrument(
      "product_verification.item",
      item_id: item_id,
      batch_id: item&.product_verification_batch_id,
      status: item&.status,
      duration_ms: ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round
    ) if started_at
  end
end
