# Seed only for production. This creates the base provider catalog required
# by the scraper and avoids inserting development-only test data.
return unless Rails.env.production? || Rails.env.development?

providers = [
  { id: 1, name: "Amazon", url: "https://www.amazon.es/" },
  { id: 2, name: "Carrefour", url: "https://www.carrefour.es/" },
  { id: 3, name: "Primor", url: "https://www.primor.eu/es_es/" },
  { id: 4, name: "Druni", url: "https://www.druni.es/" },
  { id: 5, name: "El corte ingles", url: "https://www.elcorteingles.es/" }
]

providers.each do |provider_data|
  provider = Provider.find_or_initialize_by(id: provider_data[:id])
  provider.name = provider_data[:name]
  provider.url = provider_data[:url]
  provider.save!
end
return unless Rails.env.development?

product = Product.find_or_create_by!(name: "test")
ProvidersProduct.find_or_create_by!(product: product, provider_id: 1) do |record|
  record.ssn = "test123"
end
PriceHistory.find_or_create_by!(product: product, provider_id: 1) do |record|
  record.price = 10.0
  record.currency = "EUR"
end
User.find_or_create_by!(email: "test@example.com") do |user|
  user.password = "123456"
end