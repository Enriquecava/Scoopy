class Product < ApplicationRecord
  has_many :price_histories, dependent: :delete_all
  has_many :providers_products, dependent: :delete_all
  has_many :providers, through: :providers_products
  has_many :scraper_incidents, dependent: :destroy

  def price_history_count
    price_histories.count
  end

  accepts_nested_attributes_for :providers_products, allow_destroy: true
end
