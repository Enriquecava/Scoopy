class Brand < ApplicationRecord
  include NamedCatalog
  has_many :products, dependent: :restrict_with_error
end
