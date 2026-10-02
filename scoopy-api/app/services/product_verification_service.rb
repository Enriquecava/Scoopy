require "net/http"

class ProductVerificationService
  MAX_BATCH_SIZE = 5
  PROCESS_TIMEOUT_SECONDS = 30

  class << self
    def validate_items!(items)
      raise ArgumentError, "Request must include between 1 and #{MAX_BATCH_SIZE} items" if items.nil? || !items.is_a?(Array) || !items.size.between?(1, MAX_BATCH_SIZE)

      provider_ids = items.filter_map do |item|
        next unless item.is_a?(Hash)

        provider_id = normalize_provider_id(item["provider_id"] || item[:provider_id])
        provider_id if provider_id.present?
      end

      if provider_ids.length != provider_ids.uniq.length
        raise ArgumentError, "Duplicate provider_id values are not allowed"
      end
    end

    def verify_item(item)
      process_item(item)
    end

    def verify_batch(items)
      validate_items!(items)

      threads = items.map do |item|
        Thread.new do
          Rails.application.executor.wrap do
            process_item(item)
          end
        end
      end

      ordered_results = threads.map(&:value)
      success_count = ordered_results.count { |result| result[:error].nil? }
      failed_count = ordered_results.count { |result| !result[:error].nil? }

      {
        data: ordered_results,
        meta: {
          total: ordered_results.size,
          success: success_count,
          failed: failed_count,
          all_failed: success_count.zero?
        }
      }
    end

    private

    def normalize_provider_id(value)
      return nil if value.blank?

      Integer(value.to_s.strip)
    rescue ArgumentError, TypeError
      value.to_s.strip
    end

    def process_item(item)
      unless item.is_a?(Hash)
        {
          provider_id: nil,
          ssn: nil,
          screenshot: nil,
          error: "provider_id and ssn are required"
        }
      else
        provider_id = item["provider_id"] || item[:provider_id]
        ssn = item["ssn"] || item[:ssn]

        if provider_id.blank? || ssn.blank?
          {
            provider_id: provider_id,
            ssn: ssn,
            screenshot: nil,
            error: "provider_id and ssn are required"
          }
        else
          begin
            provider_id = Integer(provider_id)
            ssn = ssn.to_s.strip
            raise ArgumentError, "Invalid ssn" unless ssn.length.between?(1, 200)

            existing_entry = ProvidersProduct.joins(:product)
              .where(provider_id: provider_id, ssn: ssn)
              .select('products.name')
              .first

            if existing_entry.present?
              Rails.logger.info("Duplicate SSN detected for provider=#{provider_id} ssn=#{ssn.inspect} existing_product=#{existing_entry.name.inspect}")

              {
                provider_id: provider_id,
                ssn: ssn,
                screenshot: nil,
                error: "duplicate_ssn",
                product_name: existing_entry.name
              }
            else
              screenshot_url = verify_product(provider_id, ssn)
              {
                provider_id: provider_id,
                ssn: ssn,
                screenshot: screenshot_url,
                error: nil
              }
            end
          rescue StandardError => e
            Rails.logger.error("Verification failed for provider=#{provider_id.inspect} ssn=#{ssn.inspect}: #{e.class}: #{e.message}")
            {
              provider_id: provider_id,
              ssn: ssn,
              screenshot: nil,
              error: "verification_failed"
            }
          end
        end
      end
    end

    def verify_product(provider_id, ssn)
      TemporaryScreenshotService.cleanup_expired

      uri = URI.parse(verifier_url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.open_timeout = 5
      http.read_timeout = PROCESS_TIMEOUT_SECONDS

      request = Net::HTTP::Post.new(uri.request_uri, "Content-Type" => "application/json")
      request.body = { provider_id: provider_id, ssn: ssn }.to_json

      response = http.request(request)
      payload = begin
        JSON.parse(response.body)
      rescue JSON::ParserError, TypeError
        nil
      end

      unless response.is_a?(Net::HTTPSuccess)
        message = payload.is_a?(Hash) ? payload["error"] : nil
        raise StandardError, message.presence || "Verifier request failed (#{response.code})"
      end

      raise StandardError, "Invalid screenshot payload returned by verifier" unless payload.is_a?(Hash)

      file_name = payload.fetch("file_name").to_s
      raise StandardError, "Invalid screenshot filename returned by verifier" unless file_name.match?(/\A[a-f0-9-]{36}\.png\z/)

      file_path = TemporaryScreenshotService::DIRECTORY.join(file_name)
      raise StandardError, "Screenshot file was not created" unless file_path.file?

      "/screenshots/#{file_name}"
    rescue Net::OpenTimeout, Net::ReadTimeout
      raise StandardError, "Verification timed out"
    end

    def verifier_url
      ENV.fetch("SCRAPER_VERIFIER_URL", "http://localhost:4000/verify")
    end
  end
end
