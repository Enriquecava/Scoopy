class RenameProvidersIdToProviderIdInPriceHistories < ActiveRecord::Migration[8.1]
  def change
    return unless column_exists?(:price_histories, :providers_id)

    rename_column :price_histories, :providers_id, :provider_id
  end
end
