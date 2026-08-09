class CreateScraperIncidents < ActiveRecord::Migration[8.1]
  def change
    create_table :scraper_incidents do |t|
      t.references :provider, null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true, type: :uuid
      t.string :status, null: false, default: 'open'

      t.timestamps
    end

    add_index :scraper_incidents, [:provider_id, :product_id], unique: true
  end
end