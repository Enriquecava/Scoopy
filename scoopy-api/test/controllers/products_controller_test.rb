require "test_helper"

class ProductsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @product = products(:one)
    @user = User.create!(email: "products.user@example.com", password: "123456")
    @auth_headers = {
      "Authorization" => "Bearer #{sign_in(@user)}"
    }
  end

  def sign_in(user)
    post user_session_url, params: { user: { email: user.email, password: "123456" } }, as: :json
    response.parsed_body.fetch("token")
  end

  test "should get index with providers and providers_products nested" do
    product = Product.create!(name: "Example product")
    provider = Provider.create!(name: "Example provider", url: "https://example.com")
    provider_product = product.providers_products.create!(provider: provider, ssn: "12345")

    get products_url, headers: @auth_headers, as: :json

    assert_response :success
    body = response.parsed_body
    assert_not_empty body

    product_payload = body.find { |item| item["id"] == product.id }
    assert_not_nil product_payload
    assert_equal ["Example provider"], product_payload.fetch("providers").map { |provider_payload| provider_payload["name"] }
    assert_equal [provider_product.ssn], product_payload.fetch("providers_products").map { |provider_payload| provider_payload["ssn"] }
    assert_equal ["Example provider"], product_payload.fetch("providers_products").map { |provider_payload| provider_payload["provider_name"] }
  end

  test "should filter products by partial name match" do
    matching_product = Product.create!(name: "Gel asd limpiador")
    Product.create!(name: "Crema hidratante")

    get products_url, params: { filter: "asd" }, headers: @auth_headers, as: :json

    assert_response :success
    product_names = response.parsed_body.map { |product_payload| product_payload["name"] }
    assert_includes product_names, matching_product.name
    assert product_names.all? { |name| name.downcase.include?("asd") }
  end

  test "should filter products case insensitively" do
    matching_product = Product.create!(name: "Suero AsD facial")

    get products_url, params: { filter: "asd" }, headers: @auth_headers, as: :json

    assert_response :success
    product_names = response.parsed_body.map { |product_payload| product_payload["name"] }
    assert_includes product_names, matching_product.name
  end

  test "should return error for unsupported query params" do
    get products_url, params: { filters: "Lucas" }, headers: @auth_headers, as: :json

    assert_response :bad_request
    assert_equal "parametro no soportado", response.parsed_body["error"]
  end

  test "should create product" do
    assert_difference("Product.count") do
      post products_url, params: { product: { name: @product.name } }, headers: @auth_headers, as: :json
    end

    assert_response :created
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
    patch product_url(@product), params: { product: { name: @product.name } }, headers: @auth_headers, as: :json
    assert_response :success
  end

  test "should destroy product" do
    assert_difference("Product.count", -1) do
      delete product_url(@product), headers: @auth_headers, as: :json
    end

    assert_response :no_content
  end
end
