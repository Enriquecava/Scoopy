class ProductVerificationBatch < ApplicationRecord
  class QueueingError < StandardError; end

  belongs_to :user
  has_many :items, class_name: "ProductVerificationItem", dependent: :destroy
  after_create_commit :enqueue_items

  enum :status, {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    failed: "failed"
  }

  validates :status, inclusion: { in: statuses.keys }

  def response_payload
    {
      id: id,
      status: status,
      data: items.order(:position).map(&:response_payload),
      meta: {
        total: total,
        success: success_count,
        failed: failed_count,
        all_failed: completed? && total.positive? && failed_count == total
      },
      error: error
    }
  end

  private

  def enqueue_items
    items.find_each { |item| ProductVerificationItemJob.perform_later(item.id) }
  rescue StandardError => e
    update_columns(status: "failed", error: "Verification could not be queued", finished_at: Time.current)
    Rails.logger.error("Product verification batch could not be queued for batch=#{id}: #{e.class}: #{e.message}")
    raise QueueingError, "Verification could not be queued"
  end
end
