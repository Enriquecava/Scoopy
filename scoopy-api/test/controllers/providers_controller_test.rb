require "test_helper"

class ProvidersControllerTest < ActionDispatch::IntegrationTest
  self.fixture_table_names = []

  setup do
    @user = User.create!(email: "providers.user@example.com", password: "123456")
    @auth_headers = {
      "Authorization" => "Bearer #{sign_in(@user)}"
    }
  end

  def sign_in(user)
    post user_session_url, params: { user: { email: user.email, password: "123456" } }, as: :json
    response.parsed_body.fetch("token")
  end

  test "should return providers ordered by name with only id and name" do
    zeta = Provider.create!(name: "Zeta provider", url: "https://zeta.example.com")
    alpha = Provider.create!(name: "Alpha provider", url: "https://alpha.example.com")

    get providers_url, headers: @auth_headers, as: :json

    assert_response :success
    assert_equal(
      {
        "data" => [
          { "id" => alpha.id, "name" => alpha.name },
          { "id" => zeta.id, "name" => zeta.name }
        ]
      },
      response.parsed_body
    )
  end

  test "should require authentication" do
    get providers_url, as: :json

    assert_response :unauthorized
  end

  test "should return an empty data list when there are no providers" do
    get providers_url, headers: @auth_headers, as: :json

    assert_response :success
    assert_equal({ "data" => [] }, response.parsed_body)
  end
end