class PriceHistory < ApplicationRecord
  belongs_to :product
  belongs_to :provider, foreign_key: :provider_id

  def provider_name
    provider&.name
  end
end
