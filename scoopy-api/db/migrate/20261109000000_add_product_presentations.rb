class AddProductPresentations < ActiveRecord::Migration[8.1]
  def up
    create_table :brands do |t|
      t.string :name, null: false
      t.timestamps
    end
    add_index :brands, "LOWER(TRIM(name))", unique: true, name: "index_brands_on_normalized_name"

    create_table :categories do |t|
      t.string :name, null: false
      t.timestamps
    end
    add_index :categories, "LOWER(TRIM(name))", unique: true, name: "index_categories_on_normalized_name"

    create_table :units do |t|
      t.decimal :value, precision: 15, scale: 4, null: false
      t.timestamps
      t.index :value, unique: true
      t.check_constraint "value > 0", name: "units_positive_value"
    end

    create_table :unit_measures do |t|
      t.string :name, null: false
      t.timestamps
    end
    add_index :unit_measures, "LOWER(TRIM(name))", unique: true, name: "index_unit_measures_on_normalized_name"

    add_reference :products, :brand, foreign_key: true
    add_reference :products, :category, foreign_key: true
    create_table :product_presentations do |t|
      t.references :product, type: :uuid, null: false, foreign_key: true
      t.references :unit, foreign_key: true
      t.references :unit_measure, foreign_key: true
      t.timestamps
      t.check_constraint "(unit_id IS NULL) = (unit_measure_id IS NULL)", name: "presentations_quantity_pair"
    end
    add_index :product_presentations, [:id, :product_id], unique: true
    add_index :product_presentations, [:product_id, :unit_id, :unit_measure_id],
      unique: true, where: "unit_id IS NOT NULL", name: "index_presentations_on_product_and_quantity"
    add_index :product_presentations, :product_id, unique: true, where: "unit_id IS NULL",
      name: "index_presentations_on_unknown_quantity"

    execute <<~SQL
      INSERT INTO product_presentations (product_id, created_at, updated_at)
      SELECT id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM products
    SQL

    execute "ALTER TABLE providers_products DROP CONSTRAINT providers_products_pkey"
    remove_index :providers_products, name: "index_providers_products_on_product_id_and_provider_id"
    execute "ALTER TABLE providers_products ADD COLUMN id bigserial PRIMARY KEY"
    add_reference :providers_products, :product_presentation, foreign_key: true
    execute <<~SQL
      UPDATE providers_products pp
      SET product_presentation_id = presentations.id
      FROM product_presentations presentations
      WHERE presentations.product_id = pp.product_id
    SQL
    change_column_null :providers_products, :product_presentation_id, false
    add_index :providers_products, [:id, :product_id, :provider_id, :product_presentation_id],
      unique: true, name: "index_provider_listings_on_full_context"
    execute <<~SQL
      ALTER TABLE providers_products ADD CONSTRAINT providers_products_presentation_product_fk
      FOREIGN KEY (product_presentation_id, product_id) REFERENCES product_presentations (id, product_id)
    SQL

    [:price_histories, :scraper_incidents].each do |table|
      add_reference table, :providers_product, foreign_key: true
      add_reference table, :product_presentation, foreign_key: true
      execute <<~SQL
        UPDATE #{table} records
        SET product_presentation_id = presentations.id
        FROM product_presentations presentations
        WHERE presentations.product_id = records.product_id
      SQL
      execute <<~SQL
        UPDATE #{table} records
        SET providers_product_id = pp.id
        FROM providers_products pp
        WHERE pp.product_id = records.product_id AND pp.provider_id = records.provider_id
      SQL
      change_column_null table, :product_presentation_id, false
      execute <<~SQL
        ALTER TABLE #{table} ADD CONSTRAINT #{table}_presentation_product_fk
        FOREIGN KEY (product_presentation_id, product_id) REFERENCES product_presentations (id, product_id)
      SQL
      add_foreign_key table, :providers_products,
        column: [:providers_product_id, :product_id, :provider_id, :product_presentation_id],
        primary_key: [:id, :product_id, :provider_id, :product_presentation_id],
        name: "#{table}_listing_context_fk", deferrable: :deferred
    end
    remove_index :scraper_incidents, name: "index_scraper_incidents_on_open_provider_and_product"
    add_index :scraper_incidents, :providers_product_id, unique: true,
      where: "status = 'open' AND providers_product_id IS NOT NULL",
      name: "index_scraper_incidents_on_open_listing"
    add_index :scraper_incidents, [:provider_id, :product_presentation_id], unique: true,
      where: "status = 'open' AND providers_product_id IS NULL",
      name: "index_scraper_incidents_on_open_legacy"
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Restore a backup: multiple listings per provider cannot be represented by the old schema"
  end
end
