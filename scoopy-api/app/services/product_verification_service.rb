require "timeout"

class ProductVerificationService
  MAX_BATCH_SIZE = 5
  PROCESS_TIMEOUT_SECONDS = 30

  class << self
    def verify_batch(items)
      raise ArgumentError, "Request must include between 1 and #{MAX_BATCH_SIZE} items" if items.nil? || !items.is_a?(Array) || !items.size.between?(1, MAX_BATCH_SIZE)

      provider_ids = items.filter_map do |item|
        next unless item.is_a?(Hash)

        provider_id = normalize_provider_id(item["provider_id"] || item[:provider_id])
        provider_id if provider_id.present?
      end

      if provider_ids.length != provider_ids.uniq.length
        raise ArgumentError, "Duplicate provider_id values are not allowed"
      end

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

    def verify_product(provider_id, ssn)
      require "open3"

      TemporaryScreenshotService.cleanup_expired

      script = <<~JS
        (async () => {
          const { verifyProductExist } = await import('./scraper/function/verifier.ts');
          const fileName = await verifyProductExist(#{provider_id}, #{JSON.generate(ssn)});
          process.stdout.write(JSON.stringify({ file_name: fileName }));
        })();
      JS

      stdout = nil
      stderr = nil
      status = nil
      pid = nil

      begin
        Timeout.timeout(PROCESS_TIMEOUT_SECONDS) do
          Open3.popen3("npx", "tsx", "--eval", script, chdir: Rails.root.parent.to_s) do |_stdin, stdout_io, stderr_io, wait_thr|
            pid = wait_thr.pid
            stdout_reader = Thread.new { stdout_io.read }
            stderr_reader = Thread.new { stderr_io.read }
            stdout = stdout_reader.value
            stderr = stderr_reader.value
            status = wait_thr.value
          end
        end
      rescue Timeout::Error
        begin
          Process.kill("TERM", pid) if pid
        rescue Errno::ESRCH
          # Process already terminated
        end
        raise StandardError, "Verification timed out"
      end

      raise StandardError, stderr.to_s.strip unless status.success?

      payload = JSON.parse(stdout)
      file_name = payload.fetch("file_name").to_s
      raise StandardError, "Invalid screenshot filename returned by verifier" unless file_name.match?(/\A[a-f0-9-]{36}\.png\z/)

      file_path = TemporaryScreenshotService::DIRECTORY.join(file_name)
      raise StandardError, "Screenshot file was not created" unless file_path.file?

      "/screenshots/#{file_name}"
    rescue JSON::ParserError
      raise StandardError, "Invalid screenshot payload returned by verifier"
    end
  end
end
