# frozen_string_literal: true

class AddRoleToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :role, :string, default: "user", null: false

    execute("UPDATE users SET role = 'user' WHERE role IS NULL")

    add_check_constraint :users,
                         "role IN ('user', 'admin')",
                         name: "users_role_check"
  end

  def down
    remove_check_constraint :users, name: "users_role_check"
    remove_column :users, :role
  end
end