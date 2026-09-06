class ProductVerificationItem < ApplicationRecord
  belongs_to :product_verification_batch

  enum :status, {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    failed: "failed"
  }

  validates :status, inclusion: { in: statuses.keys }

  def response_payload
    {
      provider_id: provider_id,
      ssn: ssn,
      screenshot: screenshot,
      error: verification_error,
      product_name: product_name
    }
  end
end
