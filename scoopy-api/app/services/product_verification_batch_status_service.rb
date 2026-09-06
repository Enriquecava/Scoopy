class ProductVerificationBatchStatusService
  def self.call(batch)
    return unless batch

    batch.with_lock do
      return if batch.completed? || batch.failed?

      items = batch.items.reload
      next unless items.all? { |item| item.completed? || item.failed? }

      success_count = items.count(&:completed?)
      batch.update!(
        status: :completed,
        total: items.size,
        success_count: success_count,
        failed_count: items.size - success_count,
        finished_at: Time.current
      )
    end
  rescue ActiveRecord::RecordNotFound
    nil
  end
end
