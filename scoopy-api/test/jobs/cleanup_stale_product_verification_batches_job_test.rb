require "test_helper"

class CleanupStaleProductVerificationBatchesJobTest < ActiveJob::TestCase
  test "fails stale processing batches and their unfinished items" do
    user = User.create!(email: "stale.processing.#{SecureRandom.uuid}@example.com", password: "123456")
    batch = ProductVerificationBatch.create!(user: user, status: :processing, total: 2, started_at: 15.minutes.ago)
    batch.update_columns(updated_at: 15.minutes.ago)
    batch.items.create!(position: 0, provider_id: "1", ssn: "ABC123", status: :processing)
    batch.items.create!(position: 1, provider_id: "2", ssn: "XYZ456", status: :completed)

    CleanupStaleProductVerificationBatchesJob.perform_now

    assert batch.reload.failed?
    assert_equal "Verification timed out", batch.error
    assert_equal 1, batch.success_count
    assert_equal 1, batch.failed_count
    assert_equal "verification_timeout", batch.items.find_by(position: 0).verification_error
  end

  test "does not fail a recent pending batch" do
    user = User.create!(email: "recent.pending.#{SecureRandom.uuid}@example.com", password: "123456")
    batch = ProductVerificationBatch.create!(user: user, status: :pending, total: 1)

    CleanupStaleProductVerificationBatchesJob.perform_now

    assert batch.reload.pending?
  end
end