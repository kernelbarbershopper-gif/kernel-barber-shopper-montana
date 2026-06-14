import * as React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Gift, Zap, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { supabase } from '../services/supabaseClient';
import { subscribeToPlans } from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function maskCpfCnpj(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  if (clean.length <= 11) {
    return clean
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function copyToClipboard(text: string) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Código copiado!'),
      () => toast.error('Não foi possível copiar')
    );
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast.success('Código copiado!'); }
    catch { toast.error('Não foi possível copiar'); }
    document.body.removeChild(ta);
  }
}

export default function PricingView() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [plans, setPlans] = React.useState<any[]>([
    { id: 'free', name: 'FREE', price: 0, features: ['Online Booking', 'Client Database', 'Service Management', 'Basic Reports', 'Email Support'] },
    { id: 'basic', name: 'SILVER', price: 29.90, features: ['Everything in Free', 'Financial Control', 'Staff Management', 'Advanced Reports', 'Priority Support', 'Cloud Backup'] },
    { id: 'pro', name: 'GOLD', price: 49.90, features: ['Everything in Silver', 'Integrated Marketing', 'Message Automation', 'Loyalty Program', 'Smart Dashboard', 'VIP Support', 'Exclusive Training'] },
    { id: 'enterprise', name: 'ENTERPRISE PRO', price: 79.90, features: ['Everything in Gold', 'Custom App', 'ERP Integration', 'Multi-location', 'Strategic Consulting', '24/7 Support', 'Exclusive Updates'] }
  ]);
  const [loading, setLoading] = React.useState(true);
  const [pixModal, setPixModal] = React.useState<{
    open: boolean; brCode?: string; brCodeBase64?: string; expiresAt?: string;
    planName?: string; bankSlipUrl?: string; barCode?: string; billingType?: string;
  }>({ open: false });
  const [checking, setChecking] = React.useState(false);
  const [cpfModal, setCpfModal] = React.useState<{ open: boolean; plan?: any; isRecurring?: boolean; cycle?: string }>({ open: false });
  const [cpfInput, setCpfInput] = React.useState('');

  React.useEffect(() => {
    const unsub = subscribeToPlans((data: any[]) => {
      setPlans(data.filter((p: any) => p.isActive !== false));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const processCheckout = async (plan: any, cpfCnpj?: string, idempotencyKey?: string) => {
    const isRecurring = plan.price > 0;
    const endpoint = isRecurring ? '/api/create-subscription' : '/api/create-checkout';
    const bodyPayload: any = {
      planId: plan.id,
      planName: plan.name,
      amount: Math.round(plan.price * 100),
      email: user!.email,
    };
    if (isRecurring) bodyPayload.cycle = plan.interval === 'yearly' ? 'YEARLY' : 'MONTHLY';
    if (cpfCnpj) bodyPayload.cpfCnpj = cpfCnpj;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(bodyPayload),
    });
    const responseText = await response.text();
    try { return JSON.parse(responseText); }
    catch { toast.error('Erro no servidor: resposta inválida.'); return null; }
  };

  const handleSelectPlan = async (plan: any) => {
    if (!user) {
      toast.error('Faça login para assinar um plano!');
      return;
    }
    setChecking(true);
    try {
      if (Number(plan.price) === 0) {
        const { data: shops } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1);
        if (shops?.[0]) {
          await supabase.from('shops').update({ plan: 'free', updated_at: new Date().toISOString() }).eq('id', shops[0].id);
        }
        toast.success('Plano Free ativado!');
        window.location.hash = '';
        window.location.reload();
        return;
      }

      const idemKey = `${user.id}-${plan.id}-${Date.now()}`;
      const data = await processCheckout(plan, undefined, idemKey);
      if (!data) return;

      if (data.error === 'CPF_CNPJ_REQUIRED') {
        setCpfModal({ open: true, plan, isRecurring: plan.price > 0, cycle: plan.interval === 'yearly' ? 'YEARLY' : 'MONTHLY' });
        return;
      }
      if (data.success && data.url) {
        window.location.href = data.url;
      } else if (data.success && (data.brCode || data.bankSlipUrl)) {
        setPixModal({
          open: true, brCode: data.brCode, brCodeBase64: data.brCodeBase64,
          expiresAt: data.expiresAt || data.nextDueDate, planName: plan.name,
          bankSlipUrl: data.bankSlipUrl, barCode: data.barCode, billingType: data.billingType,
        });
      } else {
        toast.error(data.message || data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      toast.error('Erro ao processar pagamento: ' + (error?.message || ''));
    } finally {
      setChecking(false);
    }
  };

  const handleCpfSubmit = async () => {
    if (!cpfInput.trim() || !cpfModal.plan) return;
    const cpfLimpo = cpfInput.trim().replace(/\D/g, '');
    if (cpfLimpo.length < 11) {
      toast.error('CPF/CNPJ inválido. Digite apenas números.');
      return;
    }
    setCpfModal({ open: false });
    setChecking(true);
    try {
      const idemKey = `${user!.id}-${cpfModal.plan.id}-${Date.now()}`;
      const data = await processCheckout(cpfModal.plan, cpfLimpo, idemKey);
      if (!data) return;
      if (data.success && data.url) {
        window.location.href = data.url;
      } else if (data.success && (data.brCode || data.bankSlipUrl)) {
        setPixModal({
          open: true, brCode: data.brCode, brCodeBase64: data.brCodeBase64,
          expiresAt: data.expiresAt || data.nextDueDate, planName: cpfModal.plan.name,
          bankSlipUrl: data.bankSlipUrl, barCode: data.barCode, billingType: data.billingType,
        });
      } else {
        toast.error(data.message || data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      toast.error('Erro ao processar pagamento: ' + (error?.message || ''));
    } finally {
      setChecking(false);
      setCpfInput('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 py-8"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl font-display font-bold text-white mb-4">{t('Escolha o melhor para seu salão')}</h1>
        <p className="text-[#888] text-lg max-w-2xl mx-auto">{t('Gerencie sua barbearia com inteligência artificial e ferramentas Barbeiros. Comece grátis!')}</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin inline" aria-label="Carregando planos" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {plans.map((plan, i) => {
            const isFree = plan.price === 0;
            const isEnterprise = plan.price >= 80 || plan.name.toLowerCase().includes('enterprise');
            const isGold = plan.id === 'pro' || (Number(plan.price) >= 30 && Number(plan.price) < 80);
            const isPopular = isGold;
            return (
              <div
                key={plan.id || i}
                className={cn(
                  'relative bg-[#141414] border rounded-2xl p-6 transition-all hover:scale-[1.02]',
                  isEnterprise ? 'border-[#C9A84C] shadow-lg shadow-[#C9A84C]/30 ring-2 ring-[#C9A84C]/50' :
                  isPopular ? 'border-[#C9A84C] shadow-lg shadow-[#C9A84C]/20' : 'border-[#2A2A2A] hover:border-[#3A3A3A]',
                  isFree && 'border-green-500/50'
                )}
              >
                {isEnterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A0A0A] text-[9px] font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">🏆 Kit Profissional Grátis</div>
                )}
                {isPopular && !isEnterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C9A84C] text-[#0A0A0A] text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Mais Popular</div>
                )}
                {isFree && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-[#0A0A0A] text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Grátis</div>
                )}
                <div className="text-center mb-6">
                  {isEnterprise && <p className="text-[8px] text-[#C9A84C] font-bold uppercase tracking-[3px] mb-1">RECOMENDADO</p>}
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    {isFree ? (
                      <span className="text-4xl font-bold text-green-400">Grátis</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-[#C9A84C]">{formatCurrency(plan.price)}</span>
                        <span className="text-[#888] text-sm ml-1">/{plan.interval === 'yearly' ? 'ano' : 'mês'}</span>
                      </>
                    )}
                  </div>
                  {isEnterprise && (
                    <div className="bg-gradient-to-r from-[#C9A84C]/20 to-[#E8C96A]/10 border border-[#C9A84C]/30 rounded-xl p-3 my-3">
                      <p className="text-[#C9A84C] font-bold text-sm">🎯 Máquina Personalizada com sua Logo</p>
                      <p className="text-[10px] text-[#888]">Grátis! Sua marca na máquina</p>
                    </div>
                  )}
                  {isGold && (
                    <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/10 border border-orange-500/30 rounded-xl p-3 my-3">
                      <p className="text-orange-400 font-bold text-sm">🎯 Primeiros 10 levam Kit Profissional Grátis!</p>
                      <p className="text-[10px] text-[#888]">Personalizável com sua marca</p>
                    </div>
                  )}
                  {plan.trialDays > 0 && (
                    <p className="text-[10px] text-[#C9A84C] font-bold">{plan.trialDays} dias grátis</p>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features?.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-[#eee]">
                      <CheckCircle2 className={cn('w-4 h-4 shrink-0', isEnterprise ? 'text-[#C9A84C]' : 'text-green-500')} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={checking}
                  aria-busy={checking}
                  className={cn(
                    'w-full py-3 rounded-xl font-bold text-sm transition-all',
                    isEnterprise
                      ? 'bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A0A0A] hover:brightness-110 shadow-lg shadow-[#C9A84C]/30'
                      : isFree
                        ? 'bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20'
                        : isPopular
                          ? 'bg-[#C9A84C] text-[#0A0A0A] hover:bg-[#E8C96A] shadow-lg shadow-[#C9A84C]/20'
                          : 'bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:bg-[#222]',
                    checking && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {checking ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processando...</span>
                  ) : isFree ? (
                    <span className="flex items-center justify-center gap-2"><Gift className="w-4 h-4" /> Começar Grátis</span>
                  ) : isEnterprise ? (
                    <span className="flex items-center justify-center gap-2"><Zap className="w-4 h-4" /> Garantir Kit Profissional Grátis</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><Zap className="w-4 h-4" /> Assinar Agora</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-12 bg-gradient-to-br from-[#141414] to-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Quer uma máquina personalizada?</h3>
        <p className="text-[#C9A84C] font-bold text-sm mb-6">No Enterprise PRO você ganha uma máquina com sua logo! No Gold, os primeiros 10 também levam!</p>
        <a href="https://wa.me/5562920001684" target="_blank" rel="noopener noreferrer"
          className="inline-block bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A0A0A] px-8 py-3 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#C9A84C]/20">
          Fale com Vendas
        </a>
        <p className="text-[10px] text-[#555] mt-8 uppercase tracking-widest font-bold">Enterprise Edition / 2026 — Desenvolvido por Michael Mariano / 2026</p>
      </div>

      {pixModal.open && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pix-modal-title"
          onClick={() => setPixModal({ open: false })}
        >
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <h3 id="pix-modal-title" className="text-xl font-bold text-white mb-2">
                {pixModal.billingType === 'PIX' ? 'Pagamento PIX' : 'Pagamento Boleto'}
              </h3>
              <p className="text-[#888] text-sm">Plano {pixModal.planName}</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              {pixModal.billingType === 'PIX' ? (
                <>
                  {pixModal.brCodeBase64 && (
                    <img src={pixModal.brCodeBase64} alt="QR Code PIX" className="w-56 h-56 bg-white p-4 rounded-xl" />
                  )}
                  <p className="text-[#eee] text-sm text-center">Escaneie o QR Code acima com seu banco</p>
                  {pixModal.brCode && (
                    <div className="w-full">
                      <p className="text-[10px] text-[#888] text-center mb-2">Ou copie o código PIX:</p>
                      <div className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 flex items-center gap-2">
                        <code className="text-[#C9A84C] text-[10px] break-all flex-1">{pixModal.brCode}</code>
                        <button onClick={() => copyToClipboard(pixModal.brCode || '')} className="bg-[#C9A84C] text-[#0A0A0A] px-3 py-1 rounded-lg text-[10px] font-bold shrink-0 hover:bg-[#E8C96A]">Copiar</button>
                      </div>
                    </div>
                  )}
                  {pixModal.expiresAt && <p className="text-[10px] text-[#555]">Expira em 1 hora</p>}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center"><FileText className="w-8 h-8 text-blue-500" /></div>
                  <p className="text-[#eee] text-sm text-center">Seu boleto foi gerado. Clique no botão abaixo para visualizar e pagar.</p>
                  {pixModal.barCode && (
                    <div className="w-full">
                      <p className="text-[10px] text-[#888] text-center mb-2">Linha digitável:</p>
                      <div className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                        <code className="text-[#C9A84C] text-[10px] break-all">{pixModal.barCode}</code>
                      </div>
                    </div>
                  )}
                  {pixModal.bankSlipUrl && (
                    <a href={pixModal.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-[#C9A84C] text-[#0A0A0A] py-3 rounded-xl font-bold text-sm text-center hover:bg-[#E8C96A] transition-all">Visualizar Boleto</a>
                  )}
                </>
              )}
              <div className="mt-4 pt-4 border-t border-[#2A2A2A] w-full">
                <p className="text-[10px] text-[#888] text-center">Após o pagamento, seu plano será ativado automaticamente.</p>
              </div>
              <button onClick={() => setPixModal({ open: false })} className="text-[#888] text-sm hover:text-white transition-all mt-2">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {cpfModal.open && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cpf-modal-title"
          onClick={() => setCpfModal({ open: false })}
        >
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <h3 id="cpf-modal-title" className="text-xl font-bold text-white mb-2">CPF ou CNPJ</h3>
              <p className="text-[#888] text-sm">Informe seu CPF ou CNPJ para gerar a cobrança</p>
            </div>
            <label htmlFor="cpf-input" className="sr-only">CPF ou CNPJ</label>
            <input
              id="cpf-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpfInput}
              onChange={(e) => setCpfInput(maskCpfCnpj(e.target.value))}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C] mb-4"
            />
            <button onClick={handleCpfSubmit} disabled={!cpfInput.trim() || checking} className="w-full bg-[#C9A84C] text-[#0A0A0A] py-3 rounded-xl font-bold text-sm hover:bg-[#E8C96A] transition-all disabled:opacity-50">
              {checking ? 'Processando...' : 'Continuar'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
