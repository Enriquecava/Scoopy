class CreateProducts < ActiveRecord::Migration[8.1]
  def change
    create_table :products , id: :uuid, default: 'gen_random_uuid()'  do |t|
      t.string :name, null: false
      t.timestamps
    end
  end
end
