class ScraperIncident < ApplicationRecord
  belongs_to :provider
  belongs_to :product

  enum :status, {
    open: 'open',
    resolved: 'resolved'
  }
end