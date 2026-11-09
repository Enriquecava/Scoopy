class ProductPresentationsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!
  before_action :set_product

  def create
    presentation = @product.product_presentations.new
    save_presentation(presentation)
  end

  def update
    presentation = @product.product_presentations.find(params[:id])
    save_presentation(presentation)
  end

  def destroy
    presentation = @product.product_presentations.find(params[:id])
    if presentation.destroy
      head :no_content
    else
      render json: { error: "in_use", details: presentation.errors.full_messages }, status: :conflict
    end
  rescue ActiveRecord::InvalidForeignKey
    render json: { error: "in_use" }, status: :conflict
  end

  private

  def set_product
    @product = Product.find(params[:product_id])
  end

  def save_presentation(presentation)
    attrs = params.require(:presentation).permit(:value, :unit_measure_id)
    ProductPresentation.transaction do
      if attrs[:value].blank?
        presentation.unit = nil
      else
        value = BigDecimal(attrs[:value].to_s)
        raise ArgumentError unless value.finite? && value.positive? && value < 100_000_000_000 && value == value.round(4)

        presentation.unit = Unit.find_or_create_by!(value: value)
      end
      presentation.unit_measure_id = attrs[:unit_measure_id].presence
      presentation.save!
    end
    render json: ProductPayload.presentation_payload(presentation), status: presentation.previously_new_record? ? :created : :ok
  rescue ArgumentError
    render json: { error: "invalid_quantity" }, status: :unprocessable_content
  rescue ActiveRecord::RecordInvalid => e
    if e.record.is_a?(ProductPresentation) && e.record.errors.of_kind?(:unit_id, :taken)
      render json: { error: "duplicate_presentation" }, status: :conflict
    else
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_content
    end
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "duplicate_presentation" }, status: :conflict
  end
end
