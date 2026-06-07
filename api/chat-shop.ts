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
    return res.status(503).json({ reply: '😅 O chat IA está temporariamente indisponível. Mas você pode agendar pelo botão "Agendar Horário" ou falar conosco pelo WhatsApp!' });
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

  const { message, history = [], barber = {} } = body || {};
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const prompt = `Você é um assistente de salão amigável. Seu objetivo é ajudar o cliente a escolher um corte e convencê-lo a agendar um horário. Seja simpático e persuasivo.

profissional: ${barber.name || 'Profissional'}
Bio: ${barber.bio || 'Especialista em cortes'}
Instagram: ${barber.instagram || 'N/A'}
WhatsApp: ${barber.whatsapp || 'N/A'}

Serviço disponível: Corte de Cabelo ($35.00 - 45 min)

Responda em português brasileiro, seja convincente mas natural. Se o cliente mostrar interesse, incentive a agendar.`;

  const messages: any[] = [
    { role: 'system', content: prompt },
    ...history.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: message },
  ];

  try {
    const r = await fetch(aiConfig.url, {
      method: 'POST',
      headers: aiConfig.headers,
      body: JSON.stringify({ model: aiConfig.model, messages, max_tokens: 300 }),
    });
    const data: any = await r.json();
    const reply = data?.choices?.[0]?.message?.content || '😊 Obrigado! Quer agendar um horário?';
    return res.status(200).json({ reply });
  } catch (e: any) {
    console.error('chat-shop error:', e);
    return res.status(500).json({ reply: '😅 Tive um probleminha! Mas você pode agendar clicando em "Agendar Horário" ou chamar no WhatsApp!' });
  }
}
