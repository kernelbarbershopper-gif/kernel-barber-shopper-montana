import { createClient } from '@supabase/supabase-js';
import { findOrCreateCustomer, getPixQrCode, requireAsaasKey } from './_lib/asaas';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', (err: Error) => reject(err));
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body: any = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  try {
    const { planId, planName, amount, email, cycle, cpfCnpj, billingType } = body;
    if (!planId || !amount || !email) {
      return res.status(400).json({ error: 'Missing required fields: planId, amount, email' });
    }
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF_CNPJ_REQUIRED', message: 'Informe seu CPF ou CNPJ para continuar' });
    }

    requireAsaasKey();
    const customerId = await findOrCreateCustomer({ name: email.split('@')[0], email, cpfCnpj });
    const type = billingType || 'PIX';
    const nextDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const subscriptionBody = {
      customer: customerId,
      billingType: type,
      nextDueDate,
      value: amount / 100,
      cycle: cycle || 'MONTHLY',
      description: `Assinatura Plano ${planName || 'Barber Shop'}`,
      externalReference: planId,
    };

    const response = await fetch('https://api.asaas.com/v3/subscriptions', {
      method: 'POST',
      headers: { access_token: process.env.ASAAS_API_KEY || '', 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionBody),
    });
    const responseText = await response.text();
    let data: any;
    try { data = JSON.parse(responseText); } catch { throw new Error(`Asaas invalid JSON: ${responseText}`); }

    if (!response.ok) {
      if (type === 'PIX' && data.errors?.some((e: any) => e.code === 'invalid_billingType')) {
        const boletoResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
          method: 'POST',
          headers: { access_token: process.env.ASAAS_API_KEY || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...subscriptionBody, billingType: 'BOLETO' }),
        });
        const boletoText = await boletoResponse.text();
        try { data = JSON.parse(boletoText); } catch { throw new Error(`Asaas boleto fallback failed: ${boletoText}`); }
        if (!boletoResponse.ok) {
          const errMsg = data?.errors?.[0]?.description || data?.error || 'Erro no processamento';
          return res.status(boletoResponse.status).json({ error: 'Asaas error', message: errMsg, detail: data });
        }
      } else {
        const errMsg = data?.errors?.[0]?.description || data?.error || 'Erro no processamento';
        return res.status(response.status).json({ error: 'Asaas error', message: errMsg, detail: data });
      }
    }

    const result: any = {
      success: true,
      subscriptionId: data.id,
      customerId,
      status: data.status,
      nextDueDate: data.nextDueDate || '',
      value: data.value || amount / 100,
      billingType: data.billingType || type,
    };

    try {
      const paymentsRes = await fetch(`https://api.asaas.com/v3/subscriptions/${data.id}/payments`, {
        headers: { access_token: process.env.ASAAS_API_KEY || '' },
      });
      const paymentsData: any = await paymentsRes.json().catch(() => null);
      const firstPayment = paymentsData?.data?.[0];
      if (data.billingType === 'PIX' || type === 'PIX') {
        if (firstPayment) {
          const pix = await getPixQrCode(firstPayment.id);
          result.brCode = pix.payload;
          result.brCodeBase64 = pix.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : '';
        }
      } else {
        if (firstPayment) {
          result.bankSlipUrl = firstPayment.bankSlipUrl || firstPayment.invoiceUrl || '';
          result.barCode = firstPayment.barCode || '';
        }
      }
    } catch (e) {
      console.error('Failed to fetch subscription payments:', e);
    }

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data: shopData } = await supabase.from('shops').select('id').eq('email', email).limit(1).single();
        await supabase.from('subscriptions').insert({
          asaas_subscription_id: data.id,
          asaas_customer_id: customerId,
          shop_id: shopData?.id || null,
          plan_id: planId,
          email,
          status: data.status,
          value: amount / 100,
          cycle: cycle === 'YEARLY' ? 'ANNUALLY' : (cycle || 'MONTHLY'),
          payment_method: 'PIX',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error('Failed to save subscription to Supabase:', dbError);
      }
    }

    if (idempotencyKey) res.setHeader('Idempotency-Key', idempotencyKey);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Subscription error:', error.message);
    if (error.message?.startsWith('Asaas')) {
      return res.status(400).json({ error: 'Asaas error', message: error.message.substring(0, 200) });
    }
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
