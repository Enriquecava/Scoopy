require "test_helper"

class ProductsControllerTest < ActionDispatch::IntegrationTest
  module ConcurrentSaveFailure
    def save!(...)
      if Thread.current[:simulate_providers_product_save_conflict]
        raise ActiveRecord::RecordNotUnique
      end

      super
    end
  end

  ProvidersProduct.prepend(ConcurrentSaveFailure) unless ProvidersProduct.ancestors.include?(ConcurrentSaveFailure)

  setup do
    @product = products(:one)
    @user = User.create!(email: "products.user.#{SecureRandom.uuid}@example.com", password: "123456")
    @admin = User.create!(email: "products.admin.#{SecureRandom.uuid}@example.com", password: "123456", role: :admin)
    @auth_headers = {
      "Authorization" => "Bearer #{sign_in(@user)}"
    }
    @admin_auth_headers = {
      "Authorization" => "Bearer #{sign_in(@admin)}"
    }
  end

  def sign_in(user)
    post user_session_url, params: { user: { email: user.email, password: "123456" } }, as: :json
    response.parsed_body.fetch("token")
  end

  test "should get index with products" do
    product = Product.create!(name: "Example product")
    provider = Provider.create!(name: "Example provider", url: "https://example.com")
    product.providers_products.create!(provider: provider, ssn: "12345")

    get products_url, headers: @auth_headers, as: :json

    assert_response :success
    body = response.parsed_body
    assert_not_empty body

    product_payload = body.find { |item| item["id"] == product.id }
    assert_not_nil product_payload
    assert_equal product.name, product_payload.fetch("name")
  end

  test "should filter products by partial name match" do
    matching_product = Product.create!(name: "Gel asd limpiador")
    Product.create!(name: "Crema hidratante")

    get products_url, params: { filter: "asd" }, headers: @auth_headers

    assert_response :success
    product_names = response.parsed_body.map { |product_payload| product_payload["name"] }
    assert_includes product_names, matching_product.name
    assert product_names.all? { |name| name.downcase.include?("asd") }
  end

  test "should filter products case insensitively" do
    matching_product = Product.create!(name: "Suero AsD facial")

    get products_url, params: { filter: "asd" }, headers: @auth_headers

    assert_response :success
    product_names = response.parsed_body.map { |product_payload| product_payload["name"] }
    assert_includes product_names, matching_product.name
  end

  test "should return error for unsupported query params" do
    get products_url, params: { filters: "Lucas" }, headers: @auth_headers

    assert_response :bad_request
    assert_equal "unsupported parameter", response.parsed_body["error"]
  end

  test "should reject invalid JSON payloads for verification" do
    post verify_products_url, params: "{not json", headers: @auth_headers.merge("CONTENT_TYPE" => "application/json")

    assert_response :bad_request
    assert_equal "Invalid JSON payload", response.parsed_body["error"]
  end

  test "should reject verification batches larger than the allowed limit" do
    items = Array.new(6) { { provider_id: 1, ssn: "ABC123" } }

    post verify_products_url, params: items.to_json, headers: @auth_headers.merge("CONTENT_TYPE" => "application/json")

    assert_response :bad_request
    assert_equal "Request must include between 1 and 5 items", response.parsed_body["error"]
  end

  test "should return 400 when all verification items fail" do
    original_verify_batch = ProductVerificationService.method(:verify_batch)
    ProductVerificationService.singleton_class.define_method(:verify_batch) do |_items|
      { data: [], meta: { all_failed: true } }
    end

    begin
      post verify_products_url, params: [{ provider_id: 1, ssn: "ABC123" }].to_json, headers: @auth_headers.merge("CONTENT_TYPE" => "application/json")
    ensure
      ProductVerificationService.singleton_class.define_method(:verify_batch, original_verify_batch)
    end

    assert_response :bad_request
    assert_equal true, response.parsed_body.dig("meta", "all_failed")
  end

  test "should reject invalid screenshot filenames with 404" do
    get "/screenshots/not-valid.png", headers: @auth_headers, as: :json

    assert_response :not_found
  end

  test "should require authentication to access screenshots" do
    get "/screenshots/#{SecureRandom.uuid}.png", as: :json

    assert_response :unauthorized
  end

  test "should create product" do
    provider = Provider.create!(name: "New provider", url: "https://new.example.com")

    assert_difference("Product.count") do
      post products_url, params: {
        name: "New product #{SecureRandom.uuid}",
        provider_products: [{ provider_id: provider.id, ssn: "NEW-SSN" }]
      }, headers: @auth_headers, as: :json
    end

    assert_response :created
  end

  test "should reject creating a duplicate provider and SSN pair" do
    provider = Provider.create!(name: "Duplicate provider", url: "https://duplicate.example.com")
    existing_product = Product.create!(name: "Existing product")
    existing_product.providers_products.create!(provider: provider, ssn: "DUPLICATE-SSN")

    assert_no_difference("Product.count") do
      post products_url, params: {
        name: "Duplicate product",
        provider_products: [{ provider_id: provider.id, ssn: "DUPLICATE-SSN" }]
      }, headers: @auth_headers, as: :json
    end

    assert_response :bad_request
    assert_equal "duplicate_ssn", response.parsed_body.dig("errors", 0, "error")
    assert_equal existing_product.id, response.parsed_body.dig("errors", 0, "existing_product_id")
  end

  test "should translate a concurrent provider and SSN conflict" do
    provider = Provider.create!(name: "Concurrent provider", url: "https://concurrent.example.com")
    existing_product = Product.create!(name: "Concurrent existing product")
    existing_product.providers_products.create!(provider: provider, ssn: "CONCURRENT-SSN")
    Thread.current[:simulate_providers_product_save_conflict] = true

    post products_url, params: {
      name: "Concurrent product",
      provider_products: [{ provider_id: provider.id, ssn: "CONCURRENT-SSN" }]
    }, headers: @auth_headers, as: :json

    assert_response :bad_request
    assert_equal "duplicate_ssn", response.parsed_body.dig("errors", 0, "error")
  ensure
    Thread.current[:simulate_providers_product_save_conflict] = false
  end

  test "should show product with providers_products" do
    product = Product.create!(name: "Example product")
    provider = Provider.create!(name: "Example provider", url: "https://example.com")
    product.providers_products.create!(provider: provider, ssn: "12345")

    get product_url(product), headers: @auth_headers, as: :json

    assert_response :success
    body = response.parsed_body
    assert_equal ["Example provider"], body.dig("providers_products").map { |provider_product| provider_product["provider_name"] }
  end

  test "should update product" do
    patch product_url(@product), params: { product: { name: "Updated product" } }, headers: @admin_auth_headers, as: :json
    assert_response :success
  end

  test "should update an existing provider product" do
    provider = Provider.create!(name: "Update provider", url: "https://update.example.com")
    providers_product = @product.providers_products.create!(provider: provider, ssn: "12345")

    assert_no_difference("ProvidersProduct.count") do
      patch product_url(@product), params: {
        product: {
          providers_products_attributes: [{ provider_id: provider.id, ssn: " UPDATED-SSN " }]
        }
      }, headers: @admin_auth_headers, as: :json
    end

    assert_response :success
    assert_equal "UPDATED-SSN", providers_product.reload.ssn
  end

  test "should reject updating to a provider and SSN pair used by another product" do
    provider = Provider.create!(name: "Duplicate update provider", url: "https://duplicate-update.example.com")
    other_product = Product.create!(name: "Other product")
    other_product.providers_products.create!(provider: provider, ssn: "TAKEN-SSN")
    providers_product = @product.providers_products.create!(provider: provider, ssn: "AVAILABLE-SSN")

    patch product_url(@product), params: {
      product: {
        providers_products_attributes: [{ provider_id: provider.id, ssn: "TAKEN-SSN" }]
      }
    }, headers: @admin_auth_headers, as: :json

    assert_response :bad_request
    assert_equal "duplicate_ssn", response.parsed_body.dig("errors", 0, "error")
    assert_equal "AVAILABLE-SSN", providers_product.reload.ssn
  end

  test "should normalize SSN before checking duplicate provider pairs on update" do
    provider = Provider.create!(name: "Normalized update provider", url: "https://normalized-update.example.com")
    other_product = Product.create!(name: "Normalized other product")
    other_product.providers_products.create!(provider: provider, ssn: "TAKEN-SSN")
    providers_product = @product.providers_products.create!(provider: provider, ssn: "AVAILABLE-SSN")

    patch product_url(@product), params: {
      product: {
        providers_products_attributes: [{ provider_id: provider.id, ssn: " TAKEN-SSN " }]
      }
    }, headers: @admin_auth_headers, as: :json

    assert_response :bad_request
    assert_equal "duplicate_ssn", response.parsed_body.dig("errors", 0, "error")
    assert_equal "AVAILABLE-SSN", providers_product.reload.ssn
  end

  test "should destroy an existing provider product when _destroy is true" do
    provider = Provider.create!(name: "Delete provider", url: "https://delete.example.com")
    providers_product = @product.providers_products.create!(provider: provider, ssn: "12345")

    assert_difference("ProvidersProduct.count", -1) do
      patch product_url(@product), params: {
        product: {
          providers_products_attributes: [{ provider_id: provider.id, _destroy: "true" }]
        }
      }, headers: @admin_auth_headers, as: :json
    end

    assert_response :success
    assert_not ProvidersProduct.exists?(product_id: @product.id, provider_id: provider.id)
  end

  test "should not destroy a provider product when _destroy is false" do
    provider = Provider.create!(name: "Keep provider", url: "https://keep.example.com")
    providers_product = @product.providers_products.create!(provider: provider, ssn: "12345")

    assert_no_difference("ProvidersProduct.count") do
      patch product_url(@product), params: {
        product: {
          providers_products_attributes: [{ provider_id: provider.id, _destroy: "false", ssn: "UPDATED-SSN" }]
        }
      }, headers: @admin_auth_headers, as: :json
    end

    assert_response :success
    assert_equal "UPDATED-SSN", providers_product.reload.ssn
  end

  test "should return not found when updating a missing provider product" do
    patch product_url(@product), params: {
      product: { providers_products_attributes: [{ provider_id: -1, ssn: "UPDATED-SSN" }] }
    }, headers: @admin_auth_headers, as: :json

    assert_response :not_found
  end

  test "should forbid a regular user from updating a product" do
    patch product_url(@product), params: { product: { name: "Updated product" } }, headers: @auth_headers, as: :json
    assert_response :forbidden
  end

  test "should destroy product" do
    assert_difference("Product.count", -1) do
      delete product_url(@product), headers: @admin_auth_headers, as: :json
    end

    assert_response :no_content
  end

  test "should forbid a regular user from destroying a product" do
    delete product_url(@product), headers: @auth_headers, as: :json
    assert_response :forbidden
  end

  test "should reject duplicate provider_ids in the same verification batch" do
    items = [
      { provider_id: 1, ssn: "ABC123" },
      { provider_id: 1, ssn: "XYZ456" }
    ]

    post verify_products_url, params: items.to_json, headers: @auth_headers.merge("CONTENT_TYPE" => "application/json")

    assert_response :bad_request
    assert_equal "Duplicate provider_id values are not allowed", response.parsed_body["error"]
  end
end
