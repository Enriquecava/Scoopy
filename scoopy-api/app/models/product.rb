class Product < ApplicationRecord
  belongs_to :brand, optional: true
  belongs_to :category, optional: true
  has_many :price_histories, dependent: :delete_all
  has_many :scraper_incidents, dependent: :destroy
  has_many :providers_products, dependent: :delete_all
  has_many :product_presentations, dependent: :delete_all
  has_many :providers, through: :providers_products

  after_create :create_default_presentation!

  validates :name, presence: true
  validate :catalog_references_exist

  def default_presentation
    presentation = product_presentations.find_by(unit_id: nil, unit_measure_id: nil)
    return presentation if presentation

    ProductPresentation.insert_all([{ product_id: id }], unique_by: :index_presentations_on_unknown_quantity)
    product_presentations.find_by!(unit_id: nil, unit_measure_id: nil)
  end

  def price_history_count
    price_histories.count
  end

  accepts_nested_attributes_for :providers_products, allow_destroy: true

  private

  def catalog_references_exist
    errors.add(:brand, "does not exist") if brand_id.present? && brand.nil?
    errors.add(:category, "does not exist") if category_id.present? && category.nil?
  end

  def create_default_presentation!
    product_presentations.create!
  end
end
