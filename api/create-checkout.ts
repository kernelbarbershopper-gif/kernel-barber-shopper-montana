import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

let stripeClient: any = null;
async function getStripe() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  if (!stripeClient) {
    const Stripe = (await import('stripe')).default;
    stripeClient = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
  }
  return stripeClient;
}

async function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', (err: Error) => reject(err));
  });
}

function isValidCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  return clean.length === 11 || clean.length === 14;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  let body: any = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  if (idempotencyKey) {
    res.setHeader('Idempotency-Key', idempotencyKey);
  }

  try {
    const { planId, planName, amount, email, cpfCnpj } = body;
    if (!planId || !amount || !email) {
      return res.status(400).json({ error: 'Missing required fields: planId, amount, email' });
    }
    if (!cpfCnpj || !isValidCpf(cpfCnpj)) {
      return res.status(400).json({ error: 'CPF_CNPJ_REQUIRED', message: 'Informe um CPF ou CNPJ válido' });
    }

    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `Plano ${planName || 'Barber Shop'}` },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        metadata: { planId, email, cpfCnpj },
        client_reference_id: email,
        success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/checkout-cancel`,
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data: shopData } = await supabase.from('shops').select('id').eq('email', email).limit(1).single();
        await supabase.from('payments').insert({
          order_id: session.id,
          charge_id: session.id,
          reference_id: planId,
          plan_id: planId,
          shop_id: shopData?.id || null,
          email,
          amount: amount / 100,
          status: 'pending',
          customer_id: null,
          created_at: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error('Failed to save Stripe payment to Supabase:', dbError);
      }
    }

    return res.status(200).json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
