class ProductVerificationService
  class << self
    SCREENSHOT_TTL = 1.hour
    SCREENSHOT_DIRECTORY = Rails.root.parent.join("scraper/tmp/screenshot")

    def verify_batch(items)
      raise ArgumentError, "Request must include at least one item" if items.nil? || items.empty?
      raise ArgumentError, "Request must be an array" unless items.is_a?(Array)

      results = items.map do |item|
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
            screenshot_url = verify_product(provider_id, ssn)
            {
              provider_id: provider_id,
              ssn: ssn,
              screenshot: screenshot_url,
              error: nil
            }
          rescue StandardError => e
            {
              provider_id: provider_id,
              ssn: ssn,
              screenshot: nil,
              error: e.message
            }
          end
        end
      end

      success_count = results.count { |result| result[:error].nil? }
      failed_count = results.count { |result| !result[:error].nil? }

      {
        data: results,
        meta: {
          total: results.size,
          success: success_count,
          failed: failed_count,
          all_failed: success_count.zero?
        }
      }
    end

    private

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
          const fileName = await verifyProductExist(#{provider_id}, #{JSON.generate(ssn)});
          process.stdout.write(fileName);
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

      file_name = stdout.strip
      raise StandardError, "Screenshot filename was not returned" if file_name.blank?
      "/screenshots/#{file_name}"
    end
  end
end
