-- Run this in your Supabase SQL Editor to enable Realtime
-- for stock updates and kitchen restock alerts.

ALTER PUBLICATION supabase_realtime ADD TABLE "MenuItem";
ALTER PUBLICATION supabase_realtime ADD TABLE "RestockNotification";
ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
