class ScraperIncident < ApplicationRecord
  # One incident tracks the scrape health of a specific provider/product pair.
  belongs_to :provider
  belongs_to :product

  enum :status, {
    open: 'open',
    resolved: 'resolved'
  }

  validates :status, inclusion: { in: statuses.keys }
end