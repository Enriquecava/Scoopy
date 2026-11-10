class ProductPresentation < ApplicationRecord
  belongs_to :product
  belongs_to :unit, optional: true
  belongs_to :unit_measure, optional: true
  has_many :providers_products, dependent: :restrict_with_error
  has_many :price_histories, dependent: :restrict_with_error
  has_many :scraper_incidents, dependent: :restrict_with_error

  validate :quantity_pair
  validates :unit_id, uniqueness: { scope: [:product_id, :unit_measure_id] }

  private

  def quantity_pair
    errors.add(:unit_measure, "does not exist") if unit_measure_id.present? && unit_measure.nil?
    return if unit_id.present? == unit_measure_id.present?

    errors.add(:base, "quantity and measure must both be present or both be empty")
  end
end
