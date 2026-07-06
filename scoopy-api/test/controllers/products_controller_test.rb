require "test_helper"

class ProductsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @product = products(:one)
  end

  test "should get index with providers and providers_products nested" do
    product = Product.create!(name: "Example product")
    provider = Provider.create!(name: "Example provider", url: "https://example.com")
    provider_product = product.providers_products.create!(provider: provider, ssn: "12345")

    get products_url, as: :json

    assert_response :success
    body = response.parsed_body
    assert_not_empty body

    product_payload = body.find { |item| item["id"] == product.id }
    assert_not_nil product_payload
    assert_equal ["Example provider"], product_payload.fetch("providers").map { |provider_payload| provider_payload["name"] }
    assert_equal [provider_product.ssn], product_payload.fetch("providers_products").map { |provider_payload| provider_payload["ssn"] }
    assert_equal ["Example provider"], product_payload.fetch("providers_products").map { |provider_payload| provider_payload["provider_name"] }
  end

  test "should create product" do
    assert_difference("Product.count") do
      post products_url, params: { product: { name: @product.name } }, as: :json
    end

    assert_response :created
  end

  test "should show product with providers_products" do
    product = Product.create!(name: "Example product")
    provider = Provider.create!(name: "Example provider", url: "https://example.com")
    product.providers_products.create!(provider: provider, ssn: "12345")

    get product_url(product), as: :json

    assert_response :success
    body = response.parsed_body
    assert_equal ["Example provider"], body.dig("providers_products").map { |provider_product| provider_product["provider_name"] }
  end

  test "should update product" do
    patch product_url(@product), params: { product: { name: @product.name } }, as: :json
    assert_response :success
  end

  test "should destroy product" do
    assert_difference("Product.count", -1) do
      delete product_url(@product), as: :json
    end

    assert_response :no_content
  end
end
