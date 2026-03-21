-- Increase usage limits for development
-- This updates existing usage_balances to have higher token and cost limits

UPDATE usage_balances 
SET 
    included_tokens = 10000000,  -- 10M tokens
    included_cost_cents = 500000  -- $5000
WHERE included_tokens < 10000000;
