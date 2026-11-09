require "test_helper"

class ProductEnrichmentTest < ActionDispatch::IntegrationTest
  setup do
    @product = products(:one)
    @provider = providers(:one)
    @listing = providers_products(:one)
    @admin = User.create!(email: "enrichment-admin-#{SecureRandom.uuid}@example.com", password: "123456", role: :admin)
    @user = User.create!(email: "enrichment-user-#{SecureRandom.uuid}@example.com", password: "123456")
    @admin_headers = authorization(@admin)
    @user_headers = authorization(@user)
  end

  test "catalogs are readable by users and writable only by admins" do
    post "/brands", params: { name: "Dodot" }, headers: @user_headers, as: :json
    assert_response :forbidden
    post "/brands", params: { name: "  Dodot  " }, headers: @admin_headers, as: :json
    assert_response :created
    brand_id = response.parsed_body.fetch("id")
    post "/brands", params: { name: "dodot" }, headers: @admin_headers, as: :json
    assert_response :conflict
    patch "/products/#{@product.id}", params: { product: { brand_id: brand_id } }, headers: @admin_headers, as: :json
    assert_response :success
    delete "/brands/#{brand_id}", headers: @admin_headers, as: :json
    assert_response :conflict
    get "/brands", headers: @user_headers, as: :json
    assert_equal "Dodot", response.parsed_body.first.fetch("name")
  end

  test "multiple presentations of the same provider keep prices separate" do
    measure = UnitMeasure.create!(name: "pañales")
    post "/products/#{@product.id}/presentations", params: { presentation: { value: 120, unit_measure_id: measure.id } }, headers: @admin_headers, as: :json
    assert_response :created
    presentation_id = response.parsed_body.fetch("id")
    post "/products/#{@product.id}/presentations", params: { presentation: { value: 120, unit_measure_id: measure.id } }, headers: @admin_headers, as: :json
    assert_response :conflict
    assert_equal "duplicate_presentation", response.parsed_body.fetch("error")
    post "/products/#{@product.id}/provider_listings", params: { listing: { provider_id: @provider.id, ssn: "second-ssn", product_presentation_id: presentation_id } }, headers: @admin_headers, as: :json
    assert_response :created
    second = ProvidersProduct.find(response.parsed_body.fetch("id"))
    PriceHistory.create!(product: @product, provider: @provider, providers_product: second, price: 19, currency: "EUR")
    get "/products/#{@product.id}/price_history", headers: @user_headers, as: :json
    assert_response :success
    histories = response.parsed_body.fetch("price_history")
    assert_equal [@listing.product_presentation_id, presentation_id].sort, histories.map { |history| history.fetch("product_presentation_id") }.uniq.sort
    delete "/products/#{@product.id}/presentations/#{presentation_id}", headers: @admin_headers, as: :json
    assert_response :conflict
    post "/products/#{@product.id}/provider_listings", params: { listing: { provider_id: @provider.id, ssn: @listing.ssn, product_presentation_id: presentation_id } }, headers: @admin_headers, as: :json
    assert_response :conflict
  end

  test "reassigning a listing moves its history and incidents" do
    measure = UnitMeasure.create!(name: "ml")
    presentation = @product.product_presentations.create!(unit: Unit.create!(value: 500), unit_measure: measure)
    incident = ScraperIncident.create!(product: @product, provider: @provider, providers_product: @listing)
    patch "/products/#{@product.id}/provider_listings/#{@listing.id}", params: { listing: { product_presentation_id: presentation.id } }, headers: @admin_headers, as: :json
    assert_response :success
    assert_equal presentation.id, @listing.reload.product_presentation_id
    assert_equal presentation.id, price_histories(:one).reload.product_presentation_id
    assert_equal presentation.id, incident.reload.product_presentation_id
  end

  test "orphan prices and incidents can be manually associated with the right provider" do
    orphan_provider = providers(:two)
    price = PriceHistory.create!(product: @product, provider: orphan_provider, price: 9, currency: "EUR")
    incident = ScraperIncident.create!(product: @product, provider: orphan_provider, status: :resolved)
    assert_nil price.providers_product_id
    listing = @product.providers_products.create!(provider: orphan_provider, ssn: "legacy-ssn")
    post "/products/#{@product.id}/provider_listings/#{listing.id}/legacy/prices/#{price.id}", headers: @admin_headers, as: :json
    assert_response :no_content
    post "/products/#{@product.id}/provider_listings/#{listing.id}/legacy/incidents/#{incident.id}", headers: @admin_headers, as: :json
    assert_response :no_content
    assert_equal listing.id, price.reload.providers_product_id
    assert_equal listing.id, incident.reload.providers_product_id
  end

  test "users cannot manage presentations or listings" do
    post "/products/#{@product.id}/presentations", params: { presentation: { value: 1 } }, headers: @user_headers, as: :json
    assert_response :forbidden
    patch "/products/#{@product.id}", params: { product: { brand_id: 1 } }, headers: @user_headers, as: :json
    assert_response :forbidden
    patch "/products/#{@product.id}/provider_listings/#{@listing.id}", params: { listing: { ssn: "changed" } }, headers: @user_headers, as: :json
    assert_response :forbidden
  end

  test "rejects invalid quantities, measures and product catalogs" do
    measure = UnitMeasure.create!(name: "grams")
    [ { value: 0, unit_measure_id: measure.id },
      { value: 1, unit_measure_id: nil },
      { value: 1, unit_measure_id: 9_999_999 } ].each do |attrs|
      post "/products/#{@product.id}/presentations", params: { presentation: attrs }, headers: @admin_headers, as: :json
      assert_response :unprocessable_content
    end
    patch "/products/#{@product.id}", params: { product: { brand_id: 9_999_999 } }, headers: @admin_headers, as: :json
    assert_response :unprocessable_content
  end

  private

  def authorization(user)
    post user_session_url, params: { user: { email: user.email, password: "123456" } }, as: :json
    { "Authorization" => "Bearer #{response.parsed_body.fetch('token')}" }
  end
end
