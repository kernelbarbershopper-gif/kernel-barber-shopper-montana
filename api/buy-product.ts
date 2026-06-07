import { findOrCreateCustomer, getPixQrCode, requireAsaasKey } from './_lib/asaas';

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

  const { customerName, customerEmail, customerPhone, customerCpf, productName, productPrice, quantity, shopId } = body || {};
  if (!customerName || !customerCpf || !productName || !productPrice || !quantity || !shopId) {
    return res.status(400).json({ error: 'Dados incompletos', message: 'Preencha todos os campos obrigatórios, incluindo CPF.' });
  }

  try {
    requireAsaasKey();
    const customerId = await findOrCreateCustomer({
      name: customerName,
      email: customerEmail || '',
      phone: customerPhone,
      cpfCnpj: customerCpf,
    });

    const totalValue = (Number(productPrice) * Number(quantity)).toFixed(2);
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const paymentRes = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: { access_token: process.env.ASAAS_API_KEY || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: Number(totalValue),
        dueDate,
        description: `${quantity}x ${productName}`,
        externalReference: shopId,
      }),
    });
    const paymentData: any = await paymentRes.json().catch(() => ({}));
    if (!paymentRes.ok || paymentData.errors) {
      const msg = paymentData.errors?.map((e: any) => e.description).join('; ') || 'Asaas error';
      return res.status(paymentRes.status || 400).json({ error: msg, message: msg });
    }

    const pix = await getPixQrCode(paymentData.id);
    return res.status(200).json({
      paymentId: paymentData.id,
      pix: {
        encodedImage: pix.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : '',
        payload: pix.payload,
      },
      value: totalValue,
    });
  } catch (error: any) {
    console.error('Buy product error:', error);
    return res.status(500).json({ error: error.message || 'Erro interno', message: 'Erro ao processar compra.' });
  }
}
