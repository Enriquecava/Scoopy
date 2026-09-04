class ApplicationController < ActionController::API
  private

  def require_admin!
    return if current_user&.admin?

    render json: { error: "forbidden" }, status: :forbidden
  end
end
