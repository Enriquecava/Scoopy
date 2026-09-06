require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "new users have the user role by default" do
    user = User.new(email: "new-user@example.com", password: "password")

    assert user.user?
    assert_equal "user", user.role
  end

  test "admin is a supported role" do
    user = users(:one)

    user.admin!

    assert user.admin?
  end

  test "unsupported roles are rejected" do
    user = users(:one)

    user.role = "owner"

    assert_not user.valid?
    assert_includes user.errors[:role], "is not included in the list"
  end
end
