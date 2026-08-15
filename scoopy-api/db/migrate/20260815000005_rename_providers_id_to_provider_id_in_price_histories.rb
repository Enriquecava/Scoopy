class RenameProvidersIdToProviderIdInPriceHistories < ActiveRecord::Migration[8.1]
  # up/down (not change) so rollback checks live column state instead of being
  # silently swallowed by the CommandRecorder replay.
  def up
    return unless column_exists?(:price_histories, :providers_id)

    rename_column :price_histories, :providers_id, :provider_id
  end

  def down
    return unless column_exists?(:price_histories, :provider_id)

    rename_column :price_histories, :provider_id, :providers_id
  end
end
