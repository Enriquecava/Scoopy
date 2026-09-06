class AddUniqueProviderSsnToProvidersProducts < ActiveRecord::Migration[8.1]
  def up
    return if index_exists?(:providers_products, [:provider_id, :ssn], unique: true,
      name: "index_providers_products_on_provider_id_and_ssn")

    duplicates = execute(<<~SQL.squish)
      SELECT provider_id, ssn, COUNT(*) AS count
      FROM providers_products
      GROUP BY provider_id, ssn
      HAVING COUNT(*) > 1
    SQL

    if duplicates.any?
      pairs = duplicates.map { |row| "provider_id=#{row["provider_id"]}, ssn=#{row["ssn"]}" }.join("; ")
      raise ActiveRecord::MigrationError, "Cannot add unique provider/SSN index; duplicate pairs exist: #{pairs}"
    end

    add_index :providers_products, [:provider_id, :ssn], unique: true,
      name: "index_providers_products_on_provider_id_and_ssn"
  end

  def down
    remove_index :providers_products, name: "index_providers_products_on_provider_id_and_ssn"
  end
end