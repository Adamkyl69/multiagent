# Multi-Provider LLM Setup Guide

The platform now supports per-agent model selection from **OpenAI**, **Anthropic**, **Google (Gemini)**, and **X.AI**.

## Environment Configuration

Add the following API keys to your backend `.env` file:

```bash
# Google Gemini (default)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# X.AI
XAI_API_KEY=your_xai_api_key_here
```

## Supported Models

### Google Gemini
- `gemini-1.5-pro` - Best for complex reasoning and long context
- `gemini-1.5-flash` - Fast and efficient for most tasks
- `gemini-2.0-flash-exp` - Latest experimental model

### OpenAI
- `gpt-4o` - Flagship multimodal model
- `gpt-4o-mini` - Affordable and fast
- `o1` - Advanced reasoning model

### Anthropic Claude
- `claude-3-5-sonnet-20241022` - Best for most tasks
- `claude-3-5-haiku-20241022` - Fast and cost-effective
- `claude-3-opus-20240229` - Most capable for hard tasks

### X.AI Grok
- `grok-beta` - Conversational reasoning model
- `grok-vision-beta` - Multimodal model with vision

## Backend Dependencies

Install the new provider SDKs:

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `google-genai` (Gemini)
- `openai` (OpenAI and X.AI)
- `anthropic` (Claude)

## Database Migration

Run the migration to add model selection columns:

```bash
# For SQLite (development)
sqlite3 backend.db < backend/migrations/001_add_agent_model_selection.sql

# For PostgreSQL (production)
psql $DATABASE_URL -f backend/migrations/001_add_agent_model_selection.sql
```

## Usage

### Frontend
Users can now select different models for each agent in the **Project Review** screen:
1. Click on an agent in the agent list
2. Scroll to the **Reasoning Model** selector
3. Choose a provider and model from the dropdown

### Backend API
Agent configurations now include:
```json
{
  "name": "CFO",
  "role": "Finance Lead",
  "model_provider": "openai",
  "model_name": "gpt-4o",
  ...
}
```

### Cost Tracking
Each debate turn tracks the actual provider and model used:
```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "input_tokens": 1234,
  "output_tokens": 567,
  "cost_estimate_cents": 42
}
```

## Provider-Specific Notes

### OpenAI
- Requires `OPENAI_API_KEY`
- Uses OpenAI SDK with JSON mode
- Supports all GPT-4 and o1 models

### Anthropic
- Requires `ANTHROPIC_API_KEY`
- Uses Anthropic SDK with system prompts
- Supports all Claude 3 and 3.5 models

### X.AI
- Requires `XAI_API_KEY`
- Uses OpenAI SDK with custom base URL (`https://api.x.ai/v1`)
- Supports Grok models

### Google Gemini
- Requires `GEMINI_API_KEY`
- Uses Google GenAI SDK
- Default provider for backward compatibility

## Production Validation

The runtime validator checks that at least one provider API key is configured:
- If `llm_provider=gemini`, validates `GEMINI_API_KEY`
- If `llm_provider=openai`, validates `OPENAI_API_KEY`
- If `llm_provider=anthropic`, validates `ANTHROPIC_API_KEY`
- If `llm_provider=xai`, validates `XAI_API_KEY`

Per-agent model selection overrides the default provider at runtime.

## Testing

Test each provider with a simple debate run:
1. Create a project with agents using different providers
2. Launch a debate run
3. Check the usage events table for accurate provider/model tracking
4. Verify billing calculations match provider pricing
