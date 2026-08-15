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

ActiveRecord::Schema[8.1].define(version: 2026_08_15_000005) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "jwt_denylist", force: :cascade do |t|
    t.datetime "exp", null: false
    t.string "jti", null: false
    t.index ["jti"], name: "index_jwt_denylist_on_jti"
  end

  create_table "price_histories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "currency", limit: 3, null: false
    t.decimal "price", null: false
    t.uuid "product_id", null: false
    t.bigint "provider_id", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_price_histories_on_product_id"
    t.index ["provider_id"], name: "index_price_histories_on_provider_id"
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
    t.index ["product_id", "provider_id"], name: "index_providers_products_on_product_id_and_provider_id", unique: true
    t.index ["product_id"], name: "index_providers_products_on_product_id"
    t.index ["provider_id"], name: "index_providers_products_on_provider_id"
  end

  create_table "scraper_incidents", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "product_id", null: false
    t.bigint "provider_id", null: false
    t.string "status", default: "open", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_scraper_incidents_on_product_id"
    t.index ["provider_id", "product_id"], name: "index_scraper_incidents_on_open_provider_and_product", unique: true, where: "((status)::text = 'open'::text)"
    t.index ["provider_id"], name: "index_scraper_incidents_on_provider_id"
    t.check_constraint "status::text = ANY (ARRAY['open'::character varying, 'resolved'::character varying]::text[])", name: "scraper_incidents_status_check"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "price_histories", "products"
  add_foreign_key "price_histories", "providers"
  add_foreign_key "providers_products", "products"
  add_foreign_key "providers_products", "providers"
  add_foreign_key "scraper_incidents", "products"
  add_foreign_key "scraper_incidents", "providers"
end
