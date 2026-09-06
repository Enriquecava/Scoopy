class UsersController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!

  def create
    user = User.new(user_params.merge(role: :user))

    if user.save
      render json: {
        message: "User created successfully",
        user: UserSerializer.render(user)
      }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation)
  end
end