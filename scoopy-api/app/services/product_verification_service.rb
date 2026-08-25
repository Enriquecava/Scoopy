class ProductVerificationService
  MAX_BATCH_SIZE = 5
  SCREENSHOT_TTL = 1.hour
  SCREENSHOT_DIRECTORY = Rails.root.parent.join("scraper/tmp/screenshot")

  class << self
    def verify_batch(items)
      raise ArgumentError, "Request must include between 1 and #{MAX_BATCH_SIZE} items" if items.nil? || !items.is_a?(Array) || !items.size.between?(1, MAX_BATCH_SIZE)

      provider_ids = items.filter_map do |item|
        next if !item.is_a?(Hash)

        provider_id = item["provider_id"] || item[:provider_id]
        provider_id.presence
      end

      if provider_ids.length != provider_ids.uniq.length
        raise ArgumentError, "Duplicate provider_id values are not allowed"
      end

      threads = items.map do |item|
        Thread.new do
          process_item(item)
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

            screenshot_url = verify_product(provider_id, ssn)
            {
              provider_id: provider_id,
              ssn: ssn,
              screenshot: screenshot_url,
              error: nil
            }
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

    def cleanup_expired_screenshots
      return unless SCREENSHOT_DIRECTORY.exist?

      Dir.glob(SCREENSHOT_DIRECTORY.join("*.png")).each do |file_path|
        File.delete(file_path) if File.mtime(file_path) < SCREENSHOT_TTL.ago
      rescue Errno::ENOENT
        next
      end
    end

    def verify_product(provider_id, ssn)
      require "open3"

      cleanup_expired_screenshots

      script = <<~JS
        (async () => {
          const { verifyProductExist } = await import('./scraper/function/verifier.ts');
          const result = await verifyProductExist(#{provider_id}, #{JSON.generate(ssn)});
          process.stdout.write(JSON.stringify({ file_name: result }));
        })();
      JS

      stdout, stderr, status = Open3.capture3(
        "npx",
        "tsx",
        "--eval",
        script,
        chdir: Rails.root.parent.to_s
      )

      raise StandardError, stderr.strip unless status.success?

      payload = JSON.parse(stdout)
      file_name = payload.fetch("file_name").to_s
      raise StandardError, "Invalid screenshot filename returned by verifier" unless file_name.match?(/\A[a-f0-9-]{36}\.png\z/)

      file_path = SCREENSHOT_DIRECTORY.join(file_name)
      raise StandardError, "Screenshot file was not created" unless file_path.file?

      "/screenshots/#{file_name}"
    rescue JSON::ParserError
      raise StandardError, "Invalid screenshot payload returned by verifier"
    end
  end
end
