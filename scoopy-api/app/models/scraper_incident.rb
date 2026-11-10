class ScraperIncident < ApplicationRecord
  belongs_to :provider
  belongs_to :product
  belongs_to :providers_product, optional: true
  belongs_to :product_presentation

  before_validation :assign_listing_context, on: :create
  validate :listing_context_matches

  enum :status, {
    open: 'open',
    resolved: 'resolved'
  }

  def provider_name
    provider&.name
  end

  validates :status, inclusion: { in: statuses.keys }

  private

  def assign_listing_context
    if providers_product.nil? && product_id && provider_id
      candidates = ProvidersProduct.where(product_id: product_id, provider_id: provider_id).limit(2).to_a
      self.providers_product = candidates.first if candidates.one?
      errors.add(:providers_product, "must be specified when a provider has multiple listings") if candidates.size > 1
    end
    self.product_presentation ||= providers_product&.product_presentation || product&.default_presentation
  end

  def listing_context_matches
    if product_presentation && product_presentation.product_id != product_id
      errors.add(:product_presentation, "must belong to the product")
    end
    return unless providers_product
    return if providers_product.product_id == product_id && providers_product.provider_id == provider_id

    errors.add(:providers_product, "must match the product and provider")
  end
end