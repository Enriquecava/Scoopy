class Provider < ApplicationRecord
  has_many :providers_products, dependent: :delete_all
end
