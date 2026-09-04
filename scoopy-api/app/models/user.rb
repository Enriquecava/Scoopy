class User < ApplicationRecord
  enum :role, { user: "user", admin: "admin" }, validate: true

  devise :database_authenticatable,
         :recoverable,
         :validatable,
         :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist
end