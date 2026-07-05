class ProvidersProduct < ApplicationRecord
  #  has_many :price_histories, dependent: :delete_all
  belongs_to :provider
  belongs_to :product

  def provider_name
    provider&.name
  end
  def product_name
    product&.name
  end
end
