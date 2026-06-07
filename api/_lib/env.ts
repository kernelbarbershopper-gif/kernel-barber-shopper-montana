// Shared env loader. Use this for ALL serverless functions to ensure consistent config.
export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF || '',
  ASAAS_API_KEY: process.env.ASAAS_API_KEY || '',
  ASAAS_API_BASE: process.env.ASAAS_API_BASE || 'https://api.asaas.com/v3',
  ASAAS_WEBHOOK_SECRET: process.env.ASAAS_WEBHOOK_SECRET || '',
  SETUP_MACHINE_TABLE_KEY: process.env.SETUP_MACHINE_TABLE_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  HF_TOKEN: process.env.HF_TOKEN || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  AI_PROVIDER: (process.env.AI_PROVIDER as 'groq' | 'huggingface' | 'ollama') || 'groq',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
};

export type Env = typeof env;
