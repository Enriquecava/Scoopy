require "test_helper"
require "timeout"

class ProviderListingConcurrencyTest < ActionDispatch::IntegrationTest
  self.use_transactional_tests = false

  test "an SSN update reloads the presentation after a concurrent reassignment" do
    product = products(:one)
    listing = providers_products(:one)
    original_presentation_id = listing.product_presentation_id
    original_ssn = listing.ssn
    measure = UnitMeasure.create!(name: "concurrency-#{SecureRandom.uuid}")
    presentation = product.product_presentations.create!(unit: Unit.find_or_create_by!(value: 123), unit_measure: measure)
    admin = User.create!(email: "concurrency-#{SecureRandom.uuid}@example.com", password: "123456", role: :admin)
    post user_session_url, params: { user: { email: admin.email, password: "123456" } }, as: :json
    headers = { "Authorization" => "Bearer #{response.parsed_body.fetch('token')}" }
    session = open_session
    locked = Queue.new
    release = Queue.new

    holder = Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        ProvidersProduct.transaction do
          current = ProvidersProduct.lock.find(listing.id)
          current.update!(product_presentation_id: presentation.id)
          current.price_histories.update_all(product_presentation_id: presentation.id)
          current.scraper_incidents.update_all(product_presentation_id: presentation.id)
          locked << true
          release.pop
        end
      end
    end

    request = nil
    begin
      Timeout.timeout(10) { locked.pop }
      request = Thread.new do
        session.patch "/products/#{product.id}/provider_listings/#{listing.id}",
          params: { listing: { ssn: "updated-ssn" } }, headers: headers, as: :json
      end
      Timeout.timeout(10) do
        loop do
          flunk "request finished before acquiring the listing lock (HTTP #{session.response.status})" unless request.alive?
          waiting = ActiveRecord::Base.uncached do
            ActiveRecord::Base.connection.select_value(<<~SQL)
              SELECT EXISTS (
                SELECT 1 FROM pg_stat_activity
                WHERE datname = current_database() AND wait_event_type = 'Lock'
                  AND query LIKE '%providers_products%FOR UPDATE%'
              )
            SQL
          end
          break if waiting
          sleep 0.05
        end
      end
      release << true
      holder.value
      request.value
      assert_equal 200, session.response.status
      assert_equal presentation.id, listing.reload.product_presentation_id
      assert_equal "updated-ssn", listing.ssn
      assert_equal presentation.id, price_histories(:one).reload.product_presentation_id
    ensure
      release << true if holder.alive?
      holder.join
      request&.join
      ProvidersProduct.transaction do
        current = ProvidersProduct.lock.find(listing.id)
        current.update!(product_presentation_id: original_presentation_id, ssn: original_ssn)
        current.price_histories.update_all(product_presentation_id: original_presentation_id)
        current.scraper_incidents.update_all(product_presentation_id: original_presentation_id)
      end
      presentation.destroy!
      measure.destroy!
      admin.destroy!
    end
  end

  test "concurrent default presentation creation yields a single presentation" do
    product = Product.create!(name: "Concurrent default")
    product.default_presentation.destroy!
    ready = Queue.new
    start = Queue.new
    workers = 2.times.map do
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          ready << true
          start.pop
          Product.find(product.id).default_presentation.id
        end
      end
    end

    begin
      Timeout.timeout(10) { 2.times { ready.pop } }
      2.times { start << true }
      ids = workers.map(&:value)
      assert_equal 1, ids.uniq.size
      assert_equal 1, product.product_presentations.where(unit_id: nil, unit_measure_id: nil).count
    ensure
      2.times { start << true }
      workers.each(&:join)
      product.destroy!
    end
  end
end
