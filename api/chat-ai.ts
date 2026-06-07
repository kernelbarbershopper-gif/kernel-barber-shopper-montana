import { env } from './_lib/env';

function getAIConfig() {
  const provider = env.AI_PROVIDER;
  if (provider === 'ollama') {
    if (!env.OLLAMA_BASE_URL) return null;
    return {
      url: `${env.OLLAMA_BASE_URL}/v1/chat/completions`,
      headers: { 'Content-Type': 'application/json' },
      model: 'llama3.1:8b',
    };
  }
  if (provider === 'groq') {
    if (!env.GROQ_API_KEY) return null;
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      model: 'llama-3.1-8b-instant',
    };
  }
  if (env.HF_TOKEN) {
    return {
      url: 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct/v1/chat/completions',
      headers: { Authorization: `Bearer ${env.HF_TOKEN}`, 'Content-Type': 'application/json' },
      model: 'meta-llama/Llama-3.1-8B-Instruct',
    };
  }
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const aiConfig = getAIConfig();
  if (!aiConfig) {
    return res.status(503).json({ error: 'AI_NOT_CONFIGURED' });
  }

  let body: any = {};
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
    body = JSON.parse(raw || '{}');
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { message, context = '', history = [] } = body || {};
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const systemPrompt = `Você é a **IA oficial do KERNEL BARBER SHOPPER** — uma plataforma SaaS completa para gestão de salões. Seu PAPEL PRINCIPAL é apresentar, explicar e dar suporte sobre a própria plataforma.

## IDENTIDADE DA EMPRESA:
- CNPJ: 52.846.879/0001-90
- Planos: Free, Basic, Pro e Enterprise
- Módulos: Dashboard, Agenda, Profissionais, Estoque, Financeiro, IA, Planos

## REGRAS:
1. NUNCA invente dados — use apenas o contexto fornecido
2. Responda sempre em português brasileiro
3. Se perguntarem algo fora do escopo, redirecione

## Contexto atual:
${context}`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: message },
  ];

  try {
    const r = await fetch(aiConfig.url, {
      method: 'POST',
      headers: aiConfig.headers,
      body: JSON.stringify({ model: aiConfig.model, messages, max_tokens: 1024 }),
    });
    const data: any = await r.json();
    const text = data?.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
    return res.status(200).json({ reply: text });
  } catch (e: any) {
    console.error('chat-ai error:', e);
    return res.status(500).json({ error: 'AI_ERROR', message: e?.message });
  }
}
