class ProvidersController < ApplicationController
  before_action :authenticate_user!

  # GET /providers
  def index
    providers = Provider.order(:name, :id).select(:id, :name)

    render json: {
      data: providers.as_json(only: %i[id name])
    }
  end
end
