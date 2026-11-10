class PreservePresentationHistory < ActiveRecord::Migration[8.1]
  def up
    add_index :providers_products, [:id, :product_id, :provider_id], unique: true,
      name: "index_provider_listings_on_identity"
    [:price_histories, :scraper_incidents].each do |table|
      remove_foreign_key table, name: "#{table}_listing_context_fk"
      add_foreign_key table, :providers_products,
        column: [:providers_product_id, :product_id, :provider_id],
        primary_key: [:id, :product_id, :provider_id],
        name: "#{table}_listing_identity_fk"
    end
    remove_index :scraper_incidents, name: "index_scraper_incidents_on_open_listing"
    add_index :scraper_incidents, [:providers_product_id, :product_presentation_id], unique: true,
      where: "status = 'open' AND providers_product_id IS NOT NULL",
      name: "index_scraper_incidents_on_open_listing_presentation"
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Historical records may refer to a listing's previous presentation"
  end
end
