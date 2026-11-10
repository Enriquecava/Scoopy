class UnitMeasure < ApplicationRecord
  include NamedCatalog
  has_many :product_presentations, dependent: :restrict_with_error
end
