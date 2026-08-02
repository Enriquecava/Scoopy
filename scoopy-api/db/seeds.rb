# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
return unless Rails.env.development?

product = Product.find_or_create_by!(name: "test")
provider = Provider.find_or_create_by!(name: "Amazon", url: "https://www.amazon.es")
ProvidersProduct.find_or_create_by!(product: product, provider: provider) do |record|
  record.ssn = "test123"
end
PriceHistory.find_or_create_by!(product: product, provider: provider) do |record|
  record.price = 10.0
  record.currency = "EUR"
end
User.find_or_create_by!(email: "test@example.com") do |user|
  user.password = "123456"
end
