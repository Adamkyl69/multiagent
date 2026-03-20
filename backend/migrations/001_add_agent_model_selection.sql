-- Migration: Add model_provider and model_name columns to agent_configurations
-- This enables per-agent model selection from multiple LLM providers

ALTER TABLE agent_configurations 
ADD COLUMN model_provider VARCHAR(50) DEFAULT 'gemini' NOT NULL;

ALTER TABLE agent_configurations 
ADD COLUMN model_name VARCHAR(100) DEFAULT 'gemini-1.5-flash' NOT NULL;

-- Update existing rows to have default values
UPDATE agent_configurations 
SET model_provider = 'gemini', model_name = 'gemini-1.5-flash'
WHERE model_provider IS NULL OR model_name IS NULL;
