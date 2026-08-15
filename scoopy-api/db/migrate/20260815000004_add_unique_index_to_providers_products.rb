class AddUniqueIndexToProvidersProducts < ActiveRecord::Migration[8.1]
  def change
    return if index_exists?(:providers_products, [:product_id, :provider_id])

    add_index :providers_products, [:product_id, :provider_id], unique: true
  end
end
