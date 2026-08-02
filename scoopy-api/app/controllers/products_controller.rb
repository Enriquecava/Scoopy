class ProductsController < ApplicationController
  before_action :set_product, only: %i[ show update destroy price_history ]
  before_action :authenticate_user!

  # GET /products
  def index
    @products = Product.includes(:providers_products)

    render json: @products, only:[ :id, :name]
    
  end

  # GET /products/1
  def show
    render json: @product.as_json(
      include: [
          providers_products: {
            only: %i[id ssn],
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
