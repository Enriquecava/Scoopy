require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  test "sign in returns a token when credentials are valid" do
    user = User.create!(email: "login.user@example.com", password: "123456")

    post user_session_url, params: {
      user: {
        email: user.email,
        password: "123456"
      }
    }, as: :json

    assert_response :success
    body = response.parsed_body

    assert_equal user.email, body.dig("user", "email")
    assert_not_nil body["token"]
  end
end
