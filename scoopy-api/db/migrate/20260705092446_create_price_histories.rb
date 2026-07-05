class CreatePriceHistories < ActiveRecord::Migration[8.1]
  def change
    create_table :price_histories do |t|
      t.references :provider, null: false, foreign_key: true, type: :bigint
      t.references :product, null: false, foreign_key: true, type: :uuid
      t.decimal :price, null: false
      t.string :currency, null: false, limit: 3

      t.timestamps

    end
  end
end
