ActiveSupport::Notifications.subscribe("product_verification.item") do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  Rails.logger.info(
    "product_verification.item duration_ms=#{payload[:duration_ms]} " \
    "status=#{payload[:status]} batch_id=#{payload[:batch_id]} item_id=#{payload[:item_id]}"
  )
end