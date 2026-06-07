// Shared Asaas helpers for serverless endpoints
// Keeps API key on server only and centralizes customer/cpf validation.

const API_BASE = process.env.ASAAS_API_BASE || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

function isValidCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  return clean.length === 11 || clean.length === 14;
}

export function requireAsaasKey(): void {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY not configured');
  }
}

export async function findOrCreateCustomer(params: {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj: string;
}): Promise<string> {
  if (!isValidCpf(params.cpfCnpj)) {
    throw new Error('CPF/CNPJ inválido');
  }
  const customerCpf = params.cpfCnpj.replace(/\D/g, '');
  const cleanPhone = (params.phone || '').replace(/\D/g, '');

  const listRes = await fetch(`${API_BASE}/customers?cpfCnpj=${customerCpf}`, {
    headers: { access_token: ASAAS_API_KEY },
  });
  const listData: any = await listRes.json().catch(() => ({}));
  if (listData.data && listData.data.length > 0) {
    return listData.data[0].id as string;
  }

  const createRes = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { access_token: ASAAS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      cpfCnpj: customerCpf,
      email: params.email || `${params.name.replace(/\s+/g, '').toLowerCase()}@temp.com`,
      phone: cleanPhone,
      notificationDisabled: true,
    }),
  });
  const createData: any = await createRes.json();
  if (!createRes.ok) {
    const msg = createData.errors?.map((e: any) => e.description).join('; ') || 'Asaas create customer failed';
    throw new Error(msg);
  }
  return createData.id as string;
}

export async function getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string }> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}/pixQrCode`, {
    headers: { access_token: ASAAS_API_KEY },
  });
  const data: any = await res.json().catch(() => ({}));
  return {
    encodedImage: data.encodedImage || '',
    payload: data.payload || '',
  };
}

export async function asaasFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('access_token', ASAAS_API_KEY);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
