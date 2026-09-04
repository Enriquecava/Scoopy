require "test_helper"

class RegistrationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(email: "registrations.user.#{SecureRandom.uuid}@example.com", password: "123456")
    @admin = User.create!(email: "registrations.admin.#{SecureRandom.uuid}@example.com", password: "123456", role: :admin)
  end

  def auth_headers(user)
    post user_session_url, params: { user: { email: user.email, password: "123456" } }, as: :json
    { "Authorization" => "Bearer #{response.parsed_body.fetch("token")}" }
  end

  test "regular users cannot create users" do
    assert_no_difference("User.count") do
      post users_url, params: {
        user: { email: "new.user@example.com", password: "123456", password_confirmation: "123456" }
      }, headers: auth_headers(@user), as: :json
    end

    assert_response :forbidden
  end

  test "user creation requires authentication" do
    post users_url, params: {
      user: { email: "unauthenticated@example.com", password: "123456", password_confirmation: "123456" }
    }, as: :json

    assert_response :unauthorized
  end

  test "admins can create regular users" do
    assert_difference("User.count") do
      post users_url, params: {
        user: {
          email: "new.user@example.com",
          password: "123456",
          password_confirmation: "123456"
        }
      }, headers: auth_headers(@admin), as: :json
    end

    assert_response :created
    body = response.parsed_body

    assert_equal "new.user@example.com", body.dig("user", "email")
    assert_nil body.dig("user", "encrypted_password")
    assert_includes body.dig("user").keys, "id"
    assert_includes body.dig("user").keys, "email"
    assert_equal "user", User.find_by(email: "new.user@example.com").role
  end

  test "admins cannot assign the admin role when creating users" do
    post users_url, params: {
      user: {
        email: "attempted.admin@example.com",
        password: "123456",
        password_confirmation: "123456",
        role: "admin"
      }
    }, headers: auth_headers(@admin), as: :json

    assert_response :created
    assert_equal "user", User.find_by(email: "attempted.admin@example.com").role
  end

  test "public registration is unavailable" do
    assert_no_difference("User.count") do
      post "/users/sign_up", params: {
        user: { email: "public.user@example.com", password: "123456", password_confirmation: "123456" }
      }, as: :json
    end

    assert_response :not_found
  end
end
