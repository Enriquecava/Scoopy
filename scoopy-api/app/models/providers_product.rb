class ProvidersProduct < ApplicationRecord
  belongs_to :provider
  belongs_to :product
  belongs_to :product_presentation
  has_many :price_histories, dependent: :restrict_with_error
  has_many :scraper_incidents, dependent: :restrict_with_error

  before_validation :assign_default_presentation, on: :create
  before_validation { self.ssn = ssn.strip if ssn.is_a?(String) }
  validates :ssn, presence: true, uniqueness: { scope: :provider_id }
  validate :presentation_belongs_to_product

  def provider_name
    provider&.name
  end
  def product_name
    product&.name
  end

  private

  def assign_default_presentation
    self.product_presentation ||= product&.default_presentation
  end

  def presentation_belongs_to_product
    return if product_presentation.nil? || product_presentation.product_id == product_id

    errors.add(:product_presentation, "must belong to the product")
  end
end
