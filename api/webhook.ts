import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ASAAS_WEBHOOK_SECRET = process.env.ASAAS_WEBHOOK_SECRET || '';

// Asaas sends a signature in `asaas-signature` for HMAC validation.
// We also accept the legacy `asaas-access-token` for backwards compat if the
// operator hasn't migrated, but the recommended path is HMAC.
function verifyAsaasSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature || !ASAAS_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', ASAAS_WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', (err: Error) => reject(err));
  });

  // Authentication: prefer HMAC signature, fall back to legacy access token.
  const hmacSig = req.headers['asaas-signature'] as string | undefined;
  const legacyToken = req.headers['asaas-access-token'] as string | undefined;
  const hmacOk = hmacSig ? verifyAsaasSignature(rawBody, hmacSig) : false;
  const legacyOk = legacyToken && ASAAS_WEBHOOK_SECRET && legacyToken === ASAAS_WEBHOOK_SECRET;
  if (!hmacOk && !legacyOk) {
    return res.status(401).json({ error: 'Invalid webhook auth' });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payment = event.payment;
    if (!payment || !payment.id) {
      return res.status(200).json({ received: true });
    }

    const paymentId = payment.id;
    const status = payment.status;
    const email = payment.customer?.email || payment.email || '';
    let planId = payment.externalReference || '';

    if (!planId && payment.subscription) {
      try {
        const subRes = await fetch(`https://api.asaas.com/v3/subscriptions/${payment.subscription}`, {
          headers: { access_token: process.env.ASAAS_API_KEY || '' },
        });
        const subData: any = await subRes.json().catch(() => ({}));
        planId = subData.externalReference || '';
      } catch (e) {
        console.error('Failed to fetch subscription for externalReference:', e);
      }
    }

    const value = payment.value || 0;
    if (!SUPABASE_SERVICE_KEY) {
      return res.status(200).json({ received: true });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
      await supabase.from('payments').update({
        status,
        updated_at: new Date().toISOString(),
      }).eq('order_id', paymentId);
    } catch (e) {
      console.error('Failed to update payment:', e);
    }

    if ((eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') && status === 'CONFIRMED') {
      try {
        const { data: shopsByPlan } = await supabase
          .from('shops').select('id').eq('id', planId).limit(1);
        let shopId: string | null = null;
        if (shopsByPlan && shopsByPlan.length > 0) {
          shopId = shopsByPlan[0].id;
        } else {
          const { data: shopsByEmail } = await supabase
            .from('shops').select('id').eq('email', email).limit(1);
          shopId = shopsByEmail?.[0]?.id || null;
        }

        if (shopId) {
          const { data: cur } = await supabase.from('shops').select('balance').eq('id', shopId).single();
          await supabase.from('shops')
            .update({ balance: Number(cur?.balance || 0) + Number(value) })
            .eq('id', shopId);
          await supabase.from('shops')
            .update({
              plan: planId,
              plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
            })
            .eq('id', shopId);
        }
      } catch (e) {
        console.error('Failed to update shop:', e);
      }

      try {
        await supabase.from('subscriptions').insert({
          asaas_payment_id: paymentId,
          asaas_customer_id: payment.customer?.id || '',
          plan_id: planId,
          email,
          status: 'ACTIVE',
          value,
          payment_method: 'BOLETO',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to save subscription:', e);
      }

      const isGoldOrEnterprise = planId === 'pro' || planId === 'gold' || planId === 'enterprise' || value >= 79;
      if (isGoldOrEnterprise) {
        try {
          const { data: shopsToRequest } = await supabase
            .from('shops').select('id').eq('id', planId).limit(1);
          const shopId = shopsToRequest?.[0]?.id || null;
          if (shopId) {
            const { data: existing } = await supabase.from('machine_requests').select('id').eq('shop_id', shopId).maybeSingle();
            if (!existing) {
              await supabase.from('machine_requests').insert({
                shop_id: shopId,
                status: 'pending',
                plan_name: value >= 129 ? 'Enterprise PRO' : 'Gold',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          console.error('Failed to create machine request:', e);
        }
      }
    }

    if (eventType === 'PAYMENT_OVERDUE' && status === 'OVERDUE') {
      try {
        const { data: shopsByEmail } = await supabase
          .from('shops').select('id').eq('email', email).limit(1);
        if (shopsByEmail && shopsByEmail.length > 0) {
          await supabase.from('shops').update({ status: 'suspended' }).eq('id', shopsByEmail[0].id);
        }
      } catch (e) {
        console.error('Failed to suspend shop:', e);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
}
