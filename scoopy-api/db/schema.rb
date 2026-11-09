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

ActiveRecord::Schema[8.1].define(version: 2026_11_09_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "brands", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index "lower(TRIM(BOTH FROM name))", name: "index_brands_on_normalized_name", unique: true
  end

  create_table "categories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index "lower(TRIM(BOTH FROM name))", name: "index_categories_on_normalized_name", unique: true
  end

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
    t.bigint "product_presentation_id", null: false
    t.bigint "provider_id", null: false
    t.bigint "providers_product_id"
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_price_histories_on_product_id"
    t.index ["product_presentation_id"], name: "index_price_histories_on_product_presentation_id"
    t.index ["provider_id"], name: "index_price_histories_on_provider_id"
    t.index ["providers_product_id"], name: "index_price_histories_on_providers_product_id"
  end

  create_table "product_presentations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "product_id", null: false
    t.bigint "unit_id"
    t.bigint "unit_measure_id"
    t.datetime "updated_at", null: false
    t.index ["id", "product_id"], name: "index_product_presentations_on_id_and_product_id", unique: true
    t.index ["product_id", "unit_id", "unit_measure_id"], name: "index_presentations_on_product_and_quantity", unique: true, where: "(unit_id IS NOT NULL)"
    t.index ["product_id"], name: "index_presentations_on_unknown_quantity", unique: true, where: "(unit_id IS NULL)"
    t.index ["product_id"], name: "index_product_presentations_on_product_id"
    t.index ["unit_id"], name: "index_product_presentations_on_unit_id"
    t.index ["unit_measure_id"], name: "index_product_presentations_on_unit_measure_id"
    t.check_constraint "(unit_id IS NULL) = (unit_measure_id IS NULL)", name: "presentations_quantity_pair"
  end

  create_table "product_verification_batches", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error"
    t.integer "failed_count", default: 0, null: false
    t.datetime "finished_at"
    t.datetime "started_at"
    t.string "status", default: "pending", null: false
    t.integer "success_count", default: 0, null: false
    t.integer "total", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "created_at"], name: "index_product_verification_batches_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_product_verification_batches_on_user_id"
    t.index ["user_id"], name: "index_verification_batches_on_active_user", unique: true, where: "((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text]))"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying::text, 'processing'::character varying::text, 'completed'::character varying::text, 'failed'::character varying::text])", name: "product_verification_batches_status_check"
  end

  create_table "product_verification_items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "finished_at"
    t.integer "position", null: false
    t.string "product_name"
    t.bigint "product_verification_batch_id", null: false
    t.string "provider_id"
    t.string "screenshot"
    t.string "ssn"
    t.datetime "started_at"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.string "verification_error"
    t.index ["product_verification_batch_id", "position"], name: "index_verification_items_on_batch_and_position", unique: true
    t.index ["product_verification_batch_id"], name: "idx_on_product_verification_batch_id_aa84ad99cf"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying::text, 'processing'::character varying::text, 'completed'::character varying::text, 'failed'::character varying::text])", name: "product_verification_items_status_check"
  end

  create_table "products", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "brand_id"
    t.bigint "category_id"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["brand_id"], name: "index_products_on_brand_id"
    t.index ["category_id"], name: "index_products_on_category_id"
  end

  create_table "providers", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.string "url", null: false
  end

  create_table "providers_products", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "product_id", null: false
    t.bigint "product_presentation_id", null: false
    t.bigint "provider_id", null: false
    t.string "ssn", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "product_id", "provider_id", "product_presentation_id"], name: "index_provider_listings_on_full_context", unique: true
    t.index ["product_id"], name: "index_providers_products_on_product_id"
    t.index ["product_presentation_id"], name: "index_providers_products_on_product_presentation_id"
    t.index ["provider_id", "ssn"], name: "index_providers_products_on_provider_id_and_ssn", unique: true
    t.index ["provider_id"], name: "index_providers_products_on_provider_id"
  end

  create_table "scraper_incidents", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "product_id", null: false
    t.bigint "product_presentation_id", null: false
    t.bigint "provider_id", null: false
    t.bigint "providers_product_id"
    t.string "status", default: "open", null: false
    t.datetime "updated_at", null: false
    t.index ["product_id"], name: "index_scraper_incidents_on_product_id"
    t.index ["product_presentation_id"], name: "index_scraper_incidents_on_product_presentation_id"
    t.index ["provider_id", "product_presentation_id"], name: "index_scraper_incidents_on_open_legacy", unique: true, where: "(((status)::text = 'open'::text) AND (providers_product_id IS NULL))"
    t.index ["provider_id"], name: "index_scraper_incidents_on_provider_id"
    t.index ["providers_product_id"], name: "index_scraper_incidents_on_open_listing", unique: true, where: "(((status)::text = 'open'::text) AND (providers_product_id IS NOT NULL))"
    t.index ["providers_product_id"], name: "index_scraper_incidents_on_providers_product_id"
    t.check_constraint "status::text = ANY (ARRAY['open'::character varying::text, 'resolved'::character varying::text])", name: "scraper_incidents_status_check"
  end

  create_table "unit_measures", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index "lower(TRIM(BOTH FROM name))", name: "index_unit_measures_on_normalized_name", unique: true
  end

  create_table "units", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "value", precision: 15, scale: 4, null: false
    t.index ["value"], name: "index_units_on_value", unique: true
    t.check_constraint "value > 0::numeric", name: "units_positive_value"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.string "role", default: "user", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.check_constraint "role::text = ANY (ARRAY['user'::character varying::text, 'admin'::character varying::text])", name: "users_role_check"
  end

  add_foreign_key "price_histories", "product_presentations"
  add_foreign_key "price_histories", "product_presentations", column: ["product_presentation_id", "product_id"], primary_key: ["id", "product_id"], name: "price_histories_presentation_product_fk"
  add_foreign_key "price_histories", "products"
  add_foreign_key "price_histories", "providers"
  add_foreign_key "price_histories", "providers_products"
  add_foreign_key "price_histories", "providers_products", column: ["providers_product_id", "product_id", "provider_id", "product_presentation_id"], primary_key: ["id", "product_id", "provider_id", "product_presentation_id"], name: "price_histories_listing_context_fk", deferrable: :deferred
  add_foreign_key "product_presentations", "products"
  add_foreign_key "product_presentations", "unit_measures"
  add_foreign_key "product_presentations", "units"
  add_foreign_key "product_verification_batches", "users"
  add_foreign_key "product_verification_items", "product_verification_batches"
  add_foreign_key "products", "brands"
  add_foreign_key "products", "categories"
  add_foreign_key "providers_products", "product_presentations"
  add_foreign_key "providers_products", "product_presentations", column: ["product_presentation_id", "product_id"], primary_key: ["id", "product_id"], name: "providers_products_presentation_product_fk"
  add_foreign_key "providers_products", "products"
  add_foreign_key "providers_products", "providers"
  add_foreign_key "scraper_incidents", "product_presentations"
  add_foreign_key "scraper_incidents", "product_presentations", column: ["product_presentation_id", "product_id"], primary_key: ["id", "product_id"], name: "scraper_incidents_presentation_product_fk"
  add_foreign_key "scraper_incidents", "products"
  add_foreign_key "scraper_incidents", "providers"
  add_foreign_key "scraper_incidents", "providers_products"
  add_foreign_key "scraper_incidents", "providers_products", column: ["providers_product_id", "product_id", "provider_id", "product_presentation_id"], primary_key: ["id", "product_id", "provider_id", "product_presentation_id"], name: "scraper_incidents_listing_context_fk", deferrable: :deferred
end
