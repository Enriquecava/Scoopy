require "test_helper"

class RegistrationsControllerTest < ActionDispatch::IntegrationTest
  test "sign up returns a safe user payload" do
    assert_difference("User.count") do
      post user_registration_url, params: {
        user: {
          email: "new.user@example.com",
          password: "123456",
          password_confirmation: "123456"
        }
      }, as: :json
    end

    assert_response :created
    body = response.parsed_body

    assert_equal "new.user@example.com", body.dig("user", "email")
    assert_nil body.dig("user", "encrypted_password")
    assert_includes body.dig("user").keys, "id"
    assert_includes body.dig("user").keys, "email"
  end
end
