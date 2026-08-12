class AddStatusCheckToScraperIncidents < ActiveRecord::Migration[8.1]
  def change
    add_check_constraint(
      :scraper_incidents,
      "status IN ('open', 'resolved')",
      name: 'scraper_incidents_status_check'
    )
  end
end