class MakeScraperIncidentsOpenIndexPartial < ActiveRecord::Migration[8.1]
  def change
    remove_index :scraper_incidents, [:provider_id, :product_id], unique: true, name: "index_scraper_incidents_on_provider_id_and_product_id"

    add_index :scraper_incidents, [:provider_id, :product_id],
              unique: true,
              where: "status = 'open'",
              name: "index_scraper_incidents_on_open_provider_and_product"
  end
end
