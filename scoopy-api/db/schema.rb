# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_05_092446) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "price_histories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, null: false
    t.decimal "price", null: false
    t.uuid "product_id", null: false
    t.bigint "providers_id", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_price_histories_on_product_id"
    t.index ["providers_id"], name: "index_price_histories_on_providers_id"
  end

  create_table "products", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
  end

  create_table "providers", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.string "url", null: false
  end

  create_table "providers_products", primary_key: ["product_id", "provider_id"], force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "product_id", null: false
    t.bigint "provider_id", null: false
    t.string "ssn", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_providers_products_on_product_id"
    t.index ["provider_id"], name: "index_providers_products_on_provider_id"
  end

  add_foreign_key "price_histories", "products"
  add_foreign_key "price_histories", "providers", column: "providers_id"
  add_foreign_key "providers_products", "products"
  add_foreign_key "providers_products", "providers"
end
