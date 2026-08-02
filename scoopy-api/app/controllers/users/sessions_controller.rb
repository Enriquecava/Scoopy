class Users::SessionsController < Devise::SessionsController
  respond_to :json

  private

  def respond_with(current_user, _opts = {})
    token = request.env["warden-jwt_auth.token"]

    render json: {
      user: UserSerializer.render(current_user),
      token: token
    }, status: :ok
  end

  def respond_to_on_destroy(*args)
    head :no_content
  end
end