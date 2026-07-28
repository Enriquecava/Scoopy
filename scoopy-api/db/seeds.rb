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

product = Product.create(name:'test')
provider = Provider.create(name:'Amazon', url:'https://www.amazon.es')
ProvidersProduct.create(product_id:product.id, provider_id:provider.id, ssn:'test123')
PriceHistory.create(product_id:product.id, providers_id:provider.id, price: 10.0, currency: 'EUR')
User.create!(email:'test@example.com',password:'123456')
