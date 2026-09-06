require "test_helper"

class ProductVerificationItemJobTest < ActiveJob::TestCase
  test "should persist the item result and complete the batch" do
    user = User.create!(email: "verification.job.#{SecureRandom.uuid}@example.com", password: "123456")
    batch = ProductVerificationBatch.create!(user: user, total: 1)
    item = batch.items.create!(position: 0, provider_id: "1", ssn: "ABC123")
    result = {
      provider_id: 1,
      ssn: "ABC123",
      screenshot: "/screenshots/#{SecureRandom.uuid}.png",
      error: nil
    }

    original_verify_item = ProductVerificationService.method(:verify_item)
    ProductVerificationService.singleton_class.define_method(:verify_item) { |_item| result }

    begin
      ProductVerificationItemJob.perform_now(item.id)
    ensure
      ProductVerificationService.singleton_class.define_method(:verify_item, original_verify_item)
    end

    assert item.reload.completed?
    assert batch.reload.completed?
    assert_equal 1, batch.success_count
    assert_equal result[:screenshot], item.screenshot
  end

  test "should not process an item from a failed batch" do
    user = User.create!(email: "failed.verification.job.#{SecureRandom.uuid}@example.com", password: "123456")
    batch = ProductVerificationBatch.create!(user: user, status: :failed, total: 1)
    item = batch.items.create!(position: 0, provider_id: "1", ssn: "ABC123")

    ProductVerificationItemJob.perform_now(item.id)

    assert item.reload.pending?
  end
end