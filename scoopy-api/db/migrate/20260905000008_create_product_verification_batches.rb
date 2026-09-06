class CreateProductVerificationBatches < ActiveRecord::Migration[8.1]
  def change
    create_table :product_verification_batches do |t|
      t.references :user, null: false, foreign_key: true
      t.string :status, null: false, default: "pending"
      t.integer :total, null: false, default: 0
      t.integer :success_count, null: false, default: 0
      t.integer :failed_count, null: false, default: 0
      t.text :error
      t.datetime :started_at
      t.datetime :finished_at
      t.timestamps
    end

    add_check_constraint :product_verification_batches,
      "status IN ('pending', 'processing', 'completed', 'failed')",
      name: "product_verification_batches_status_check"

    add_index :product_verification_batches, [:user_id, :created_at]
    add_index :product_verification_batches, :user_id,
      unique: true,
      where: "status IN ('pending', 'processing')",
      name: "index_verification_batches_on_active_user"

    create_table :product_verification_items do |t|
      t.references :product_verification_batch, null: false, foreign_key: true
      t.integer :position, null: false
      t.string :provider_id
      t.string :ssn
      t.string :status, null: false, default: "pending"
      t.string :screenshot
      t.string :verification_error
      t.string :product_name
      t.datetime :started_at
      t.datetime :finished_at
      t.timestamps
    end

    add_check_constraint :product_verification_items,
      "status IN ('pending', 'processing', 'completed', 'failed')",
      name: "product_verification_items_status_check"
    add_index :product_verification_items, [:product_verification_batch_id, :position], unique: true,
      name: "index_verification_items_on_batch_and_position"
  end
end
