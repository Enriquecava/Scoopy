module Api
  module Validators
    module_function

    def valid_asin?(value)
      return false unless value.is_a?(String)
      return false if value.empty?
      return false if value.match?(/[#\$;\-\-]/)
      return false if value.match?(/\s/)
      return false if value.match?(/['\"\\]/)
      return false if value.match?(/\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b/i)

      value.match?(/\A[A-Za-z0-9]{10}\z/)
    end

    def valid_payload?(payload)
      payload_error(payload).nil?
    end

    def payload_error(payload)
      return "Payload must be a JSON object" unless payload.is_a?(Hash)
      return "Payload keys must be strings" if payload.keys.any? { |key| !key.is_a?(String) }

      required_fields = %w[asin product_name]
      optional_fields = %w[created_at updated_at]
      allowed_fields = required_fields + optional_fields

      payload.keys.each do |key|
        next if allowed_fields.include?(key)

        return "Unsupported field: #{key}"
      end

      required_fields.each do |field|
        next if payload.key?(field)

        return "Missing required field: #{field}"
      end

      return "Field 'asin' must be a non-empty string" unless payload["asin"].is_a?(String) && !payload["asin"].strip.empty?
      return "Field 'product_name' must be a non-empty string" unless payload["product_name"].is_a?(String) && !payload["product_name"].strip.empty?

      nil
    end
  end
end
