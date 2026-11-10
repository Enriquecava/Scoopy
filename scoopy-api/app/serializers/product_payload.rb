class ProductPayload
  def self.list(product)
    { id: product.id, name: product.name, brand: catalog(product.brand), category: catalog(product.category) }
  end

  def self.detail(product)
    ActiveRecord::Associations::Preloader.new(
      records: [product],
      associations: [:brand, :category, { providers_products: :provider }, { product_presentations: [:unit, :unit_measure] }]
    ).call
    listings = product.providers_products.map { |listing| listing_payload(listing) }
    listings_by_presentation = listings.group_by { |listing| listing[:product_presentation_id] }
    list(product).merge(
      providers_products: listings,
      presentations: product.product_presentations.map { |presentation|
        presentation_payload(presentation).merge(
          providers_products: listings_by_presentation.fetch(presentation.id, [])
        )
      }
    )
  end

  def self.catalog(record)
    record && { id: record.id, name: record.name }
  end

  def self.presentation_payload(presentation)
    {
      id: presentation.id,
      unit: presentation.unit && { id: presentation.unit.id, value: presentation.unit.value },
      unit_measure: catalog(presentation.unit_measure)
    }
  end

  def self.listing_payload(listing)
    {
      id: listing.id, provider_id: listing.provider_id, provider_name: listing.provider_name,
      ssn: listing.ssn, product_presentation_id: listing.product_presentation_id
    }
  end
end
