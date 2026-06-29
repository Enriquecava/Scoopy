require "sinatra/base"
require "json"
require_relative "../db"
require_relative "../lib/logger"
require_relative "../lib/validators"

module Routes
  class Products < Sinatra::Base
    def self.db
      DatabaseConnection.connect
    end
    before do
      env["request_id"] = SecureRandom.uuid
    end

    get "/products" do

      Api::AppLogger.info(event:"get_products", message:"Listing products", request_id: env["request_id"], service:"products")

      if self.class.db.nil?
        status 500
        Api::AppLogger.error(event:"DB_CONNECTION",message: "Database connection is not available", request_id: env["request_id"],service:"products")
        return { error: "Internal server error" }.to_json
      end

      sql = "SELECT asin, product_name FROM products;"
      params_sql = []

      result = self.class.db.exec_params(sql, params_sql)
      Api::AppLogger.info(event:"products_listed", message:"Products listed successfully", request_id: env["request_id"], service:"products", payload: result.map { |row| row_to_h(row) }.to_json)
      result.map { |row| row_to_h(row) }.to_json
    end

    get "/products/:asin" do
      asin = params[:asin]

      unless Api::Validators.valid_asin?(asin)
        status 400
        Api::AppLogger.warn(event:"asin_validation",message: "Invalid ASIN provided", asin: asin, request_id: env["request_id"], service:"products")
        return { error: "Invalid ASIN" }.to_json
      end

      Api::AppLogger.info(event:"get_product", message:"Fetching product by ASIN", asin: asin, request_id: env["request_id"], service:"products")

      if self.class.db.nil?
        status 500
        Api::AppLogger.error(event:"DB_CONNECTION", message:"Database connection is not available", request_id: env["request_id"], service:"products")
        return { error: "Internal server error" }.to_json
      end

      result = self.class.db.exec_params(
        "SELECT asin,product_name FROM products WHERE asin = $1",
        [asin]
      )

      if result.ntuples.zero?
        not_found_response
      else
        Api::AppLogger.info(event:"product_fetched", message:"Product fetched successfully", asin: asin, request_id: env["request_id"], service:"products", payload:row_to_h(result[0]).to_json)
        row_to_h(result[0]).to_json
      end
    end

    delete "/products/:asin" do
      asin = params[:asin]

      unless Api::Validators.valid_asin?(asin)
        status 400
        Api::AppLogger.warn(event:"asin_validation", message:"Invalid ASIN provided", asin: asin, request_id: env["request_id"], service: "products")
        return { error: "Invalid ASIN" }.to_json
      end

      Api::AppLogger.info(event:"delete_product", message:"Deleting product by ASIN", asin: asin, request_id: env["request_id"], service: "products")

      if self.class.db.nil?
       status 500
        Api::AppLogger.error(event:"DB_CONNECTION", message:"Database connection is not available", request_id: env["request_id"], service: "products")
        return { error: "Internal server error" }.to_json
      end

      result = self.class.db.exec_params("DELETE FROM products WHERE asin = $1 RETURNING asin", [asin])

      if result.ntuples.zero?
        not_found_response
      else
        Api::AppLogger.info(event:"product_deleted", message:"Product deleted successfully", asin: asin, request_id: env["request_id"], service: "products")
        { message: "Product deleted", asin: result[0]["asin"] }.to_json
      end
    end

    post "/products" do
      payload = begin
        JSON.parse(request.body.read)
      rescue JSON::ParserError => e
        status 400
        Api::AppLogger.warn(event:"invalid_json_payload", message:"Invalid JSON payload", error: e.message, request_id: env["request_id"], service:"products")
        return { error: "Invalid JSON payload" }.to_json
      end

      validation_error = Api::Validators.payload_error(payload)
      unless validation_error.nil?
        status 400
        Api::AppLogger.warn(event:"invalid_payload", message:"Invalid payload", error: validation_error, request_id: env["request_id"], service: "products")
        return { error: validation_error }.to_json
      end

      asin = payload["asin"]
      product_name = payload["product_name"]

      unless Api::Validators.valid_asin?(asin)
        status 400
        Api::AppLogger.warn(event:"invalid_asin", message:"Invalid ASIN provided for creation", asin: asin, request_id: env["request_id"], service: "products")
        return { error: "Invalid ASIN" }.to_json
      end

      if product_name.nil? || product_name.to_s.strip.empty?
        status 400
        Api::AppLogger.warn(event:"invalid_product_name", message:"Invalid product name", product_name: product_name, request_id: env["request_id"], service:"products")
        return { error: "Invalid product name" }.to_json
      end

      if self.class.db.nil?
        status 500
        Api::AppLogger.error(event:"DB_CONNECTION", message:"Database connection is not available", request_id: env["request_id"], service: "products")
        return { error: "Internal server error" }.to_json
      end

      Api::AppLogger.info(event:"create_product", message:"Creating product", asin: asin, product_name: product_name, request_id: env["request_id"], service:"products")

      begin
        result = self.class.db.exec_params(
          <<~SQL,
            INSERT INTO products (asin, product_name)
            VALUES ($1, $2)
            RETURNING asin, product_name
          SQL
          [asin, product_name]
        )

        status 201
        content_type :json
        Api::AppLogger.info(event:"product_created", message:"Product created successfully", asin: asin, product_name: product_name, request_id: env["request_id"], service:"products", payload:row_to_h(result[0]).to_json)
        row_to_h(result[0]).to_json

      rescue PG::UniqueViolation => e
        status 409
        Api::AppLogger.warn(event: "duplicate_asin", message: "ASIN already exists", asin: asin, error: e.message, service: "products", request_id: env["request_id"])
        { error: "ASIN already exists" }.to_json
      rescue PG::Error => e
        status 500
        Api::AppLogger.error(event: "DB_ERROR", message: "Database error creating product", asin: asin, error: e.message, request_id: env["request_id"], service:"products")
        { error: "Database error" }.to_json
      end
    end

    get "/products/:asin/price-history" do
      asin = params[:asin]
      unless Api::Validators.valid_asin?(asin)
        status 400
        Api::AppLogger.warn(event:"asin_validation",message: "Invalid ASIN provided", asin: asin, request_id: env["request_id"], service:"price_history")
        return { error: "Invalid ASIN" }.to_json
      end

      Api::AppLogger.info(event:"get_price_history", message:"Fetching price history for product", asin: asin, request_id: env["request_id"], service:"price_history")

      if self.class.db.nil?
        status 500
        Api::AppLogger.error(event:"DB_CONNECTION", message:"Database connection is not available", request_id: env["request_id"], service:"price_history")
        return { error: "Internal server error" }.to_json
      end
      checkAsin = self.class.db.exec_params(
        "SELECT asin,product_name FROM products WHERE asin = $1",
        [asin]
      )
      if checkAsin.ntuples.zero?
        not_found_response
      else
        result = self.class.db.exec_params(
          "SELECT price, observed_at FROM price_history WHERE product_asin = $1 ORDER BY observed_at DESC",
          [asin]
        )
        if result.ntuples.zero?
          status 200
          Api::AppLogger.info(event:"no_price_history_for_product", message:"Product has no price history", asin: params[:asin], request_id: env["request_id"], service:"price_history")
          { error: "Product has no price history" }.to_json
        else
          Api::AppLogger.info(event:"price_history_fetched", message:"Price history fetched successfully", asin: asin, request_id: env["request_id"], service:"price_history", payload: result.map { |row| { price: row["price"], recorded_at: row["recorded_at"] } }.to_json)
          {
            asin:asin,
            price_history: result.map { |row| { price: row["price"], time: row["observed_at"] } }
          }.to_json
        end
      end
    end

    private

    def not_found_response
      status 404
      Api::AppLogger.warn(event:"product_not_found", message:"Product not found", asin: params[:asin], request_id: env["request_id"], service:"products")
      { error: "Product not found" }.to_json
    end

    def row_to_h(row)
      {
        asin: row["asin"],
        name: row["product_name"]
      }
    end
  end
end
