class Unit < ApplicationRecord
  has_many :product_presentations, dependent: :restrict_with_error
  validates :value, numericality: { greater_than: 0 }, uniqueness: true
end
