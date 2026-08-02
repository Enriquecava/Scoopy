module Users
  class RegistrationsController < Devise::RegistrationsController
    respond_to :json

    protected

    def sign_up(_resource_name, resource)
      resource
    end

    def respond_with(resource, _opts = {})
      if resource.persisted?
        render json: {
          message: "User created successfully",
          user: UserSerializer.render(resource)
        }, status: :created
      else
        render json: {
          errors: ["Unable to create user"]
        }, status: :unprocessable_entity
      end
    end
  end
end