class CreateProvidersProducts < ActiveRecord::Migration[8.1]
  def change
    create_table :providers_products, primary_key: [:product_id, :provider_id] do |t|
      t.references :product, null: false, foreign_key: true, type: :uuid
      t.references :provider, null: false, foreign_key: true, type: :bigint
      t.string :ssn, null: false

      t.timestamps
    end
  end
end