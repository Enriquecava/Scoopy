class ProviderListingsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!
  before_action :set_product

  def create
    listing = @product.providers_products.create!(listing_params)
    render json: ProductPayload.listing_payload(listing), status: :created
  rescue ActiveRecord::RecordInvalid => e
    render_listing_error(e.record)
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "duplicate_ssn" }, status: :conflict
  end

  def update
    listing = @product.providers_products.find(params[:id])
    ProvidersProduct.transaction do
      listing.update!(listing_params.except(:provider_id))
      listing.price_histories.update_all(product_presentation_id: listing.product_presentation_id)
      listing.scraper_incidents.update_all(product_presentation_id: listing.product_presentation_id)
    end
    render json: ProductPayload.listing_payload(listing)
  rescue ActiveRecord::RecordInvalid => e
    render_listing_error(e.record)
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "duplicate_ssn" }, status: :conflict
  end

  def assign_legacy
    listing = @product.providers_products.find(params[:id])
    collection = { "prices" => @product.price_histories, "incidents" => @product.scraper_incidents }.fetch(params[:record_type])
    record = collection.find(params[:record_id])
    if record.providers_product_id.present? || record.provider_id != listing.provider_id
      render json: { error: "incompatible_record" }, status: :unprocessable_content
      return
    end
    record.update!(providers_product: listing, product_presentation: listing.product_presentation)
    head :no_content
  rescue KeyError
    render json: { error: "invalid_record_type" }, status: :bad_request
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_content
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "open_incident_exists" }, status: :conflict
  end

  private

  def set_product
    @product = Product.find(params[:product_id])
  end

  def listing_params
    params.require(:listing).permit(:provider_id, :ssn, :product_presentation_id)
  end

  def render_listing_error(record)
    if record.errors.of_kind?(:ssn, :taken)
      render json: { error: "duplicate_ssn" }, status: :conflict
    else
      render json: { errors: record.errors.full_messages }, status: :unprocessable_content
    end
  end
end
