module NamedCatalog
  extend ActiveSupport::Concern

  included do
    before_validation { self.name = name.to_s.strip }
    validates :name, presence: true, uniqueness: { case_sensitive: false }
  end
end
