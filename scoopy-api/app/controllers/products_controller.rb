class ProductsController < ApplicationController
  before_action :set_product, only: %i[ show update destroy price_history incidents ]
  before_action :authenticate_user!

  # GET /products
  def index
    unsupported_params = request.query_parameters.keys - ["filter"]
    if unsupported_params.any?
      render json: { error: "unsupported parameter" }, status: :bad_request
      return
    end

    @products = Product.includes(:providers_products)
    filter = params[:filter].presence
    filter = filter.to_s.strip

    if filter.present?
      escaped_filter = ActiveRecord::Base.sanitize_sql_like(filter)
      @products = @products.where("products.name ILIKE ?", "%#{escaped_filter}%")
    end

    render json: @products, only:[ :id, :name]
    
  end

  # GET /products/1
  def show
    render json: @product.as_json(
      include: [
          providers_products: {
            only: %i[id ssn provider_id],
            methods: [:provider_name]
          }
      ]
    )
  end

  # POST /products
  def create
    @product = Product.new(post_product_params)

    if @product.save
      render json: @product.as_json(
        include: [
            providers_products: {
              only: %i[id ssn],
              methods: [:provider_name]
            }
        ]
      ), status: :created, location: @product
    else
      render json: @product.errors, status: :unprocessable_content
    end
  end

  #PATCH/PUT /products/1
  def update
    @product.providers_products.destroy_all if request.put?
    if @product.update(update_product_params)
      render json: @product.as_json(
        include: [
            providers_products: {
              only: %i[id ssn provider_id],
              methods: [:provider_name]
            }
        ]
      )
    else
      render json: @product.errors, status: :unprocessable_content
    end
  end

  # DELETE /products/1
  def destroy
    @product.destroy!
  end

  # GET /products/1/price_history
  def price_history
    histories = @product.price_histories.order(created_at: :desc).as_json(
      only: [:price, :currency, :created_at],
      methods: [:provider_name]
    )

    render json: {
      id: @product.id,
      name: @product.name,
      price_history: histories
    }
  end

  # GET /products/1/incidents
  def incidents
    incidents = @product.scraper_incidents
      .includes(:provider)
      .where(status: :open)
      .order(created_at: :desc)
      .map do |incident|
        incident.as_json(
          only: %i[id product_id provider_id status created_at],
          methods: [:provider_name]
        )
      end

    render json: incidents
  end

  def screenshot
    filename = params[:filename].to_s
    return head :not_found if filename.blank? || !filename.match?(/\A[a-f0-9-]{36}\.png\z/)

    screenshot_dir = Rails.root.parent.join("scraper/tmp/screenshot").expand_path
    file_path = screenshot_dir.join(filename)
    return head :not_found unless file_path.file?

    file_realpath = file_path.realpath
    screenshot_root = screenshot_dir.realpath
    return head :not_found unless file_realpath.to_s == file_path.to_s || file_realpath.to_s.start_with?("#{screenshot_root}/")

    send_file file_realpath, type: "image/png", disposition: "inline"
  rescue Errno::ENOENT
    head :not_found
  end

  def verify
    payload = request.body.read
    items = payload.present? ? JSON.parse(payload) : []

    if !items.is_a?(Array) || !items.size.between?(1, ProductVerificationService::MAX_BATCH_SIZE)
      render json: { error: "Request must include between 1 and #{ProductVerificationService::MAX_BATCH_SIZE} items" }, status: :bad_request
      return
    end

    result = ProductVerificationService.verify_batch(items)

    if result[:meta][:all_failed]
      render json: result, status: :bad_request
      return
    end

    render json: result, status: :ok
  rescue JSON::ParserError
    render json: { error: "Invalid JSON payload" }, status: :bad_request
  rescue ArgumentError => e
    render json: { error: e.message }, status: :bad_request
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_product
      @product = Product.find(params.expect(:id))
    end

    def post_product_params
      params.require(:product).permit(
        :name,
        providers_products_attributes: [:ssn, :provider_id]
      )
    end

    def update_product_params
      params.require(:product).permit(
        :name,
        providers_products_attributes: [:ssn, :provider_id, :_destroy]
      )
    end
end
