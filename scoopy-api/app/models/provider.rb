class Provider < ApplicationRecord
  has_many :providers_products, dependent: :delete_all
  has_many :scraper_incidents, dependent: :destroy
end
