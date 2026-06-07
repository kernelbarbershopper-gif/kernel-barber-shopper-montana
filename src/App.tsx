/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  DollarSign, 
  Bot, 
  Settings,
  Store,
  User as UserIcon, 
  Plus, 
  TrendingUp, 
  Star, 
  Search, 
  ChevronRight,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  ShieldCheck,
  CreditCard,
  Building2,
  Trash2,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Gift,
  Zap,
  FileText,
  Instagram,
  Phone,
  Crown,
  Banknote,
  ArrowUpDown,
  Bell,
  Smartphone,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useLocale } from './contexts/LocaleContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import PricingView from './components/PricingView';
// Global handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('GLOBAL: Unhandled promise rejection:', event.reason?.message || event.reason, event.reason?.stack || '');
  });
}
import { supabase } from './services/supabaseClient';
import PlansManagement from './components/PlansManagement';
import LojaOnlineView from './components/LojaOnlineView';
import {
  subscribeToShops,
  subscribeToPlans,
  subscribeToUsers,
  addShop,
  updateShop,
  addPlan,
  updatePlan,
  deleteUser,
  sendPasswordResetEmail,
  getActiveShopsCount,
  getTotalUsersCount,
  getMRR,
  getNewShopsLast30Days,
  subscribeToAppointments,
  addAppointment,
  updateAppointment,
  subscribeToCollection,
  addItem,
  updateItem,
  deletePlan,
  getShopByOwner,
  deleteInventoryItem,
  addBarber,
  updateBarber,
  deleteBarber,
  subscribeToSubscriptions,
  subscribeToPayments,
  subscribeToWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  requestWithdrawal,
  saveMachineRequest,
  checkMachineRequestExists
} from './services/dbService';
import { useMaintenance } from './hooks/useMaintenance';

type View = 'dashboard' | 'agenda' | 'barbers' | 'estoque' | 'financeiro' | 'ia' | 'admin' | 'pricing' | 'setup' | 'welcome';

interface Message {
  role: 'ia' | 'user';
  text: string;
  time: string;
}

function MainApp() {
  const { user, logout, isAdmin, userData } = useAuth();
  const { t } = useLocale();
  
  // SIMPLE: Force admin true for this specific email - nothing else matters
  const isAdminFinal = user?.email === 'kernelbarbershopper@gmail.com' ? true : (isAdmin || false);
  
  const [activeView, setActiveView] = React.useState<View>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('redirectToPricing')) {
      localStorage.removeItem('redirectToPricing');
      return 'pricing';
    }
    return 'dashboard';
  });
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'ia',
      text: '?? Bem-vindo ao KERNEL BARBER SHOPPER! Sou a IA oficial da plataforma. Posso te apresentar nossos m�dulos (Agenda, Estoque, Financeiro, Barbeiros), explicar os planos ou te ajudar com dados do sua barbearia. O que voc� quer saber?',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [activeAdminTab, setActiveAdminTab] = React.useState<'overview' | 'shops' | 'users' | 'plans' | 'settings'>('overview');
  const [isNewOwner, setIsNewOwner] = React.useState(false);
  const [shopPlan, setShopPlan] = React.useState('free');
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const unreadCount = React.useMemo(() => notifications.filter((n: any) => !n.read).length, [notifications]);
  const maintenance = useMaintenance();

  const PLAN_FEATURES: Record<string, { appointments: number; barbers: number; stock: boolean; financeiro: boolean; ia: boolean; label: string; maxProducts: number; maxStoreProducts: number }> = {
    free: { appointments: 10, barbers: 1, stock: true, financeiro: false, ia: false, label: 'Free', maxProducts: 5, maxStoreProducts: 0 },
    basic: { appointments: Infinity, barbers: 3, stock: true, financeiro: true, ia: true, label: 'Prata', maxProducts: 10, maxStoreProducts: 10 },
    pro: { appointments: Infinity, barbers: 5, stock: true, financeiro: true, ia: true, label: 'Gold', maxProducts: Infinity, maxStoreProducts: Infinity },
    gold: { appointments: Infinity, barbers: Infinity, stock: true, financeiro: true, ia: true, label: 'Gold', maxProducts: Infinity, maxStoreProducts: Infinity },
    enterprise: { appointments: Infinity, barbers: Infinity, stock: true, financeiro: true, ia: true, label: 'Enterprise', maxProducts: Infinity, maxStoreProducts: Infinity },
  };

  const features = PLAN_FEATURES[shopPlan] || PLAN_FEATURES.free;

  // Get shopId
  const shopId = React.useMemo(() => {
    if (userData?.shopId) return userData.shopId;
    return user?.id || '';
  }, [userData, user]);
  
  const [shopIdLoading, setShopIdLoading] = React.useState(true);
  
  React.useEffect(() => {
    const setupShopId = async () => {
      if (!user?.id) {
        setShopIdLoading(false);
        return;
      }
      
      try {
        const existingShop = await getShopByOwner(user.id);
        if (existingShop) {
          setShopPlan(existingShop.plan || 'free');
        } else {
          const shopId = crypto.randomUUID();
          await addShop({
            id: shopId,
            owner_id: user.id,
            name: 'Minha Barbearia',
            plan: 'free',
          });
          console.log('Shop created:', shopId);
          setIsNewOwner(true);
        }
      } catch (error) {
        console.error('Error setting up shopId:', error);
      } finally {
        setShopIdLoading(false);
      }
    };
    
    setupShopId();
  }, [user]);

  // Notification subscriptions
  React.useEffect(() => {
    if (!shopId || shopId === 'undefined') return;

    const unsubAppointments = subscribeToAppointments(shopId, (data) => {
      const recentPending = data.filter((a: any) =>
        a.status === 'pending' &&
        new Date(a.created_at || a.date) > new Date(Date.now() - 60000)
      );
      recentPending.forEach((app: any) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === `app-${app.id}`)) return prev;
          return [{
            id: `app-${app.id}`,
            type: 'appointment',
            message: `Novo agendamento de ${app.user_name || 'cliente'} �s ${app.date ? new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--'}`,
            time: new Date().toISOString(),
            read: false,
            view: 'agenda',
          }, ...prev].slice(0, 20);
        });
      });
    });

    const unsubStock = subscribeToCollection('inventory', (data) => {
      const lowStock = data.filter((item: any) => (item.quantity || 0) <= 5);
      lowStock.forEach((item: any) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === `stock-${item.id}`)) return prev;
          return [{
            id: `stock-${item.id}`,
            type: 'stock',
            message: `Estoque baixo: ${item.name} � apenas ${item.quantity} unidade(s)`,
            time: new Date().toISOString(),
            read: false,
            view: 'estoque',
          }, ...prev].slice(0, 20);
        });
      });
    });

    return () => { unsubAppointments(); unsubStock(); };
  }, [shopId]);

  // Click outside to close notification panel
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Guided tour for new owners
  React.useEffect(() => {
    if (isNewOwner && !shopIdLoading && user?.id) {
      const tourKey = `kernel_tour_${user.id}`;
      if (!localStorage.getItem(tourKey)) {
        localStorage.setItem(tourKey, '1');
        setActiveView('ia');
        setMessages([{
          role: 'ia',
          text: `?? **Bem-vindo ao KERNEL BARBER SHOPPER!**

Que bom ter voc� como dono da plataforma! Vou te guiar pelos principais m�dulos:

**1?? ?? Dashboard** � M�tricas em tempo real do sua barbearia
**2?? ?? Agenda** � Gerencie agendamentos de forma inteligente
**3?? ?? Barbeiros** � Cadastre e acompanhe sua equipe
**4?? ?? Estoque** � Controle de produtos com alertas inteligentes
**5?? ?? Financeiro** � Receitas, despesas e lucro
**6?? ?? IA (eu!)** � Estou aqui para ajudar sempre
**7?? ?? Planos** � Escolha o melhor para sua barbearia

**Quer saber mais sobre algum m�dulo?** � s� me perguntar! ??`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    }
  }, [isNewOwner, shopIdLoading, user?.id]);

  // Check machine request for Gold/Enterprise plans
  React.useEffect(() => {
    if (!shopId || shopId === 'undefined' || shopIdLoading) return;
    const isGoldOrEnterprise = shopPlan === 'pro' || shopPlan === 'gold' || shopPlan === 'enterprise';
    if (!isGoldOrEnterprise) return;
    checkMachineRequestExists(shopId).then(exists => {
      if (!exists) setActiveView('welcome');
    }).catch(() => {});
  }, [shopPlan, shopId, shopIdLoading]);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const newMsg: Message = {
      role: 'user',
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    // Build real context from shop data
    const buildContext = async () => {
      let context = `BARBEARIA: KERNEL BARBER SHOPPER\n`;
      context += `Usu�rio: ${user?.displayName || 'Admin'}\n`;
      
      const fmtDate = (dt: string) => dt.split('T')[0];
      const fmtTime = (dt: string) => {
        const d = new Date(dt);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };
      
      if (shopId) {
        const today = new Date().toISOString().split('T')[0];
        const todayApps = await new Promise<any[]>((resolve) => {
          subscribeToAppointments(shopId, resolve);
        });
        const confirmedToday = todayApps.filter((a: any) => fmtDate(a.date) === today && a.status === 'confirmed');
        const pendingToday = todayApps.filter((a: any) => fmtDate(a.date) === today && a.status === 'pending');
        
        context += `\n?? AGENDAMENTOS HOJE:\n`;
        context += `- Confirmados: ${confirmedToday.length}\n`;
        context += `- Pendentes: ${pendingToday.length}\n`;
        
        if (confirmedToday.length > 0) {
          context += `Detalhes (confirmados):\n`;
          confirmedToday.slice(0, 5).forEach((a: any) => {
            context += `  � ${a.time || fmtTime(a.date)} - ${a.user_name || 'Cliente'} (${a.service_name || a.service || 'Servi�o'}) - $${Number(a.service_price) || 0} - Tel: ${a.user_phone || 'N/A'}\n`;
          });
        }
        if (pendingToday.length > 0) {
          context += `\nPendentes:\n`;
          pendingToday.slice(0, 5).forEach((a: any) => {
            context += `  � ${a.time || fmtTime(a.date)} - ${a.user_name || 'Cliente'} (${a.service_name || a.service || 'Servi�o'}) - Tel: ${a.user_phone || 'N/A'}\n`;
          });
        }

        const allConfirmed = todayApps.filter((a: any) => a.status === 'confirmed');
        const uniqueClients = [...new Map(allConfirmed.filter((a: any) => a.user_name).map((a: any) => [a.user_name, a])).values()];
        if (uniqueClients.length > 0) {
          context += `\n?? CLIENTES CADASTRADOS:\n`;
          uniqueClients.slice(0, 15).forEach((c: any) => {
            const totalVisits = todayApps.filter((a: any) => a.user_name === c.user_name && a.status === 'confirmed').length;
            const lastVisit = [...todayApps].reverse().find((a: any) => a.user_name === c.user_name);
            context += `  � ${c.user_name} - Tel: ${c.user_phone || 'N/A'} - ${totalVisits} visita(s)${lastVisit ? ` - �ltimo: ${lastVisit.service_name || lastVisit.service || 'N/A'}` : ''}\n`;
          });
        }
        
        try {
          const stockItems = await new Promise<any[]>((resolve) => {
            subscribeToCollection('inventory', resolve, shopId);
          });
          const lowStock = stockItems.filter((item: any) => (item.quantity || 0) <= 5);
          if (lowStock.length > 0) {
            context += `\n**?? Estoque Baixo:**\n`;
            lowStock.slice(0, 3).forEach((item: any) => {
              context += `  � ${item.name}: ${item.quantity || 0} unidades\n`;
            });
          }
        } catch (e) {
          console.error('Stock fetch error:', e);
        }
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
        const recentApps = todayApps.filter((a: any) => fmtDate(a.date) >= dateStr && a.status === 'confirmed');
        const revenue = recentApps.reduce((sum: number, app: any) => sum + (Number(app.service_price) || 0), 0);
        
        context += `\n?? FINANCEIRO (30 dias):\n`;
        context += `- Agendamentos: ${recentApps.length}\n`;
        context += `- Receita: $${revenue.toFixed(2)}\n`;
        context += `- Ticket m�dio: $${recentApps.length > 0 ? (revenue / recentApps.length).toFixed(2) : '0'}\n`;
      } else {
        context += `\n?? Nenhuma loja selecionada ainda.\n`;
      }
      
      return context;
    };

    try {
      const context = await buildContext();
      const history = messages.slice(1);
      const r = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context, history }),
      });
      const data = await r.json();
      const aiResponse = data.reply || data.error || '?? IA temporariamente indispon�vel.';

      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'ia',
        text: aiResponse,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error('AI Error:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'ia',
        text: '? Desculpe, tive um problema ao processar sua mensagem. Tente novamente.',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, locked: false },
    { id: 'agenda' as View, label: 'Agenda', icon: Calendar, locked: false },
    { id: 'barbers' as View, label: 'Barbeiros', icon: Users, locked: false },
    { id: 'estoque' as View, label: 'Estoque', icon: Package, locked: !features.stock },
    { id: 'financeiro' as View, label: 'Financeiro', icon: DollarSign, locked: !features.financeiro },
    { id: 'ia' as View, label: 'IA Assistente', icon: Bot, locked: !features.ia },
    { id: 'pricing' as View, label: 'Planos', icon: CreditCard, locked: false },
  ];

  // Admin: ONLY sees admin page, never the beauty dashboard
  if (isAdminFinal) {
    return <ErrorBoundary><AdminLayout user={user} logout={logout} activeTab={activeAdminTab} setActiveTab={setActiveAdminTab} /></ErrorBoundary>;
  }
  if (!isAdminFinal && maintenance) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{t('Manuten��o')}</h1>
            <p className="mt-4">{t('O sistema est� em manuten��o. Por favor, tente novamente mais tarde.')}</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#C9A84C] selection:text-black">
      {/* Mobile Bottom Navigation */}
<nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#141414] border-t border-[#2A2A2A] flex items-center justify-between px-2">
          <div className="flex items-center">
            {navItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => item.locked ? setActiveView('pricing') : setActiveView(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                  activeView === item.id
                    ? "text-[#C9A84C]"
                    : item.locked ? "text-[#555]" : "text-[#888]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-bold">{item.locked ? `?? ${item.label}` : item.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-full bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-[#888] hover:text-red-500 hover:border-red-500/30 transition-all"
          >
            <LogOut className="w-3 h-3" />
          </button>
          <LanguageSwitcher />
        </nav>

      {/* Desktop Top Navigation */}
      <nav className="h-16 bg-[#141414] border-b border-[#2A2A2A] hidden lg:flex items-center px-6 gap-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
          <span className="text-[#C9A84C] font-display font-bold tracking-tight text-lg">KERNEL BARBER SHOPPER</span>
        </div>

        <div className="hidden md:flex items-center gap-1 ml-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.locked ? setActiveView('pricing') : setActiveView(item.id)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                activeView === item.id
                  ? "bg-[#C9A84C] text-[#0A0A0A] shadow-lg shadow-[#C9A84C]/20"
                  : item.locked ? "text-[#555] cursor-not-allowed" : "text-[#888] hover:text-[#C9A84C] hover:bg-[#C9A84C]/10"
              )}
            >
              {item.locked ? `?? ${item.label}` : item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto md:ml-0">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#888] hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                <div className="p-3 border-b border-[#2A2A2A] flex items-center justify-between">
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Notifica��es</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                      className="text-[10px] text-[#C9A84C] font-bold hover:underline"
                    >
                      Marcar tudo lido
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto custom-scroll">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-[#555]">Nenhuma notifica��o</p>
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <button
                        key={n.id}
                        onClick={() => { setActiveView(n.view); setNotifOpen(false); setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x)); }}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#2A2A2A] transition-all border-b border-[#2A2A2A]/50 last:border-0",
                          !n.read ? "bg-[#C9A84C]/5" : ""
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          n.type === 'appointment' ? "bg-blue-500/20" : "bg-orange-500/20"
                        )}>
                          {n.type === 'appointment' ? (
                            <Calendar className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Package className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white leading-snug">{n.message}</p>
                          <p className="text-[10px] text-[#555] mt-1">{new Date(n.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-[#C9A84C] shrink-0 mt-1.5" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#888] hover:text-red-500 hover:border-red-500/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest leading-none mb-1">Logado como</p>
            <p className="text-xs font-bold text-white leading-none">{user?.displayName?.split(' ')[0] || 'Usu�rio'}</p>
          </div>
        </div>
      </nav>

      <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Sidebar - Desktop Only */}
        <aside className="w-64 bg-[#141414] border-r border-[#2A2A2A] py-8 hidden lg:flex flex-col gap-8 flex-shrink-0 overflow-y-auto">
          <div className="px-6 flex flex-col gap-2">
            <p className="text-[10px] text-[#888] uppercase tracking-[2px] font-bold mb-4 opacity-50">Menu principal</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => item.locked ? setActiveView('pricing') : setActiveView(item.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative font-medium",
                  activeView === item.id
                    ? "text-[#C9A84C] bg-[#C9A84C]/10 shadow-[inset_2px_0_0_0_#C9A84C]"
                    : item.locked ? "text-[#555]" : "text-[#888] hover:text-[#C9A84C] hover:bg-[#C9A84C]/5"
                )}
              >
                <item.icon className={cn("w-4 h-4", activeView === item.id ? "text-[#C9A84C]" : "")} />
                <span>{item.locked ? `?? ${item.label}` : item.label}</span>
              </button>
            ))}

          </div>
        </aside>

        {/* Main Content - Add padding bottom on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll pb-20 lg:pb-6">
          {/* Show loading while getting shopId */}
          {(shopIdLoading || !shopId || shopId === 'undefined') && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
              <span className="ml-3 text-[#888]">Carregando dados da loja...</span>
            </div>
          )}
          
           <AnimatePresence mode="wait">
             {!shopIdLoading && shopId && activeView === 'dashboard' && <DashboardView onNavigate={setActiveView} shopId={shopId} />}
              {!shopIdLoading && shopId && activeView === 'agenda' && <AgendaView onNavigate={setActiveView} shopId={shopId} maxAppointments={features.appointments} />}
              {!shopIdLoading && activeView === 'barbers' && <BarbersView shopId={shopId} onNavigate={setActiveView} maxBarbers={features.barbers} />}
              {!shopIdLoading && shopId && activeView === 'estoque' && <StockView onNavigate={setActiveView} shopId={shopId} maxProducts={features.maxProducts} />}
               {!shopIdLoading && activeView === 'financeiro' && <FinanceiroView shopId={shopId || ''} />}
              {!shopIdLoading && activeView === 'pricing' && <PricingView />}
              {!shopIdLoading && activeView === 'welcome' && <WelcomeMachineView shopId={shopId} onNavigate={setActiveView} />}
              {!shopIdLoading && activeView === 'lojaonline' && <LojaOnlineView />}
            {activeView === 'ia' && (
              <IAAssistantView
                key="ia"
                messages={messages}
                input={input}
                setInput={setInput}
                sendMessage={handleSendMessage}
                isTyping={isTyping}
                chatEndRef={chatEndRef}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}

function AdminLayout({ user, logout, activeTab, setActiveTab }: any) {
  // System status (maintenance) handling
  const [globalSettings, setGlobalSettings] = React.useState<any>(null);
  const [loadingSettings, setLoadingSettings] = React.useState(true);

  // Load settings once
  React.useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from('settings').select('*').maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setGlobalSettings(data);
        } else {
          // create default row if none
          const { data: inserted } = await supabase.from('settings').insert({ system_online: true });
          setGlobalSettings(inserted[0]);
        }
      } catch (e) {
        console.error('Error loading settings', e);
      } finally {
        setLoadingSettings(false);
      }
    };
    load();
  }, []);

  const toggleSystem = async () => {
    if (!globalSettings) return;
    const newVal = !globalSettings.system_online;
    await supabase.from('settings').upsert({ id: globalSettings.id, system_online: newVal });
    setGlobalSettings({ ...globalSettings, system_online: newVal });
  };
  const { t } = useLocale();
  const [shops, setShops] = React.useState<any[]>([]);
  const [plans, setPlans] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [allUsers, setAllUsers] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState({
    activeShops: 0,
    mrr: 0,
    totalUsers: 0,
    newShops30d: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [shopSearch, setShopSearch] = React.useState('');
  const [userSearch, setUserSearch] = React.useState('');
  const [showCreateShop, setShowCreateShop] = React.useState(false);
  const [editingShop, setEditingShop] = React.useState<any>(null);
  const [newShopForm, setNewShopForm] = React.useState({ name: '', ownerEmail: '', plan: 'free', durationDays: 30 });
  const [editPlanForm, setEditPlanForm] = React.useState({ plan: 'free', durationDays: 30 });
  const [creating, setCreating] = React.useState(false);
  const [subscriptions, setSubscriptions] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [withdrawals, setWithdrawals] = React.useState<any[]>([]);
  const [withdrawNote, setWithdrawNote] = React.useState('');
  const [selectedWithdraw, setSelectedWithdraw] = React.useState<any>(null);

  React.useEffect(() => {
    const unsubShops = subscribeToShops<any>((data) => {
      setShops(data);
      setLoading(false);
    });

    const unsubPlans = subscribeToPlans<any>((data) => {
      setPlans(data);
    });

    const unsubUsers = subscribeToUsers<any>((data) => {
      setUsers(data);
    });

    const unsubSubs = subscribeToSubscriptions((data) => setSubscriptions(data));
    const unsubPays = subscribeToPayments((data) => setPayments(data));
    const unsubWD = subscribeToWithdrawals((data) => setWithdrawals(data));

    const fetchAllShopUsers = async () => {
      try {
        const { data: barbers } = await supabase.from('barbers').select('*');
        const shopUsers = (barbers || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          email: b.email || '',
          role: 'barber',
          shopId: b.shop_id
        }));
        setAllUsers(shopUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching shop users:', error);
        setLoading(false);
      }
    };

    fetchAllShopUsers();

    const calcStats = async () => {
      try {
        const activeShops = await getActiveShopsCount();
        const mrr = await getMRR();
        const totalUsers = await getTotalUsersCount();
        const newShops30d = await getNewShopsLast30Days();
        setStats({ activeShops, mrr, totalUsers: totalUsers + allUsers.length, newShops30d });
      } catch (e) {
        console.error('Error calc stats:', e);
      }
    };
    calcStats();

    return () => {
      unsubShops();
      unsubPlans();
      unsubUsers();
      unsubSubs();
      unsubPays();
      unsubWD();
    };
  }, []);

  React.useEffect(() => {
    setNewShopForm({ name: '', ownerEmail: '', plan: 'free', durationDays: 30 });
  }, [showCreateShop]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleToggleShopStatus = async (shop: any) => {
    const newStatus = shop.status === 'active' ? 'suspended' : 'active';
    try {
      await updateShop(shop.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating shop:', error);
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta loja permanentemente?')) return;
    try {
      await supabase.from('shops').delete().eq('id', shopId);
      setEditingShop(null);
    } catch (error) {
      console.error('Error deleting shop:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usu�rio?')) return;
    try {
      await deleteUser(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCreateShop = async () => {
    if (!newShopForm.name || !newShopForm.ownerEmail) return;
    setCreating(true);
    try {
      const shopId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(newShopForm.durationDays));
      await addShop({
        id: shopId,
        owner_id: shopId,
        name: newShopForm.name,
        email: newShopForm.ownerEmail,
        plan: newShopForm.plan,
        status: 'active',
        plan_expires_at: expiresAt.toISOString(),
      });
      setShowCreateShop(false);
    } catch (error) {
      console.error('Error creating shop:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditPlan = async () => {
    if (!editingShop) return;
    try {
      const updates: any = { plan: editPlanForm.plan };
      if (editPlanForm.durationDays > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(editPlanForm.durationDays));
        updates.plan_expires_at = expiresAt.toISOString();
      }
      await updateShop(editingShop.id, updates);
      setEditingShop(null);
    } catch (error) {
      console.error('Error updating shop plan:', error);
    }
  };

  const openEditShop = (shop: any) => {
    setEditingShop(shop);
    setEditPlanForm({ plan: shop.plan || 'free', durationDays: 30 });
  };

  const planBadge = (plan: string) => {
    const styles: Record<string, string> = {
      gold: "bg-[#C9A84C]/20 text-[#C9A84C]",
      pro: "bg-[#C9A84C]/20 text-[#C9A84C]",
      enterprise: "bg-gradient-to-r from-[#C9A84C]/30 to-[#E8C96A]/20 text-[#E8C96A]",
      basic: "bg-blue-500/20 text-blue-400",
      free: "bg-gray-500/20 text-gray-400",
    };
    return styles[plan] || styles.free;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, { cls: string; label: string; icon: any }> = {
      active: { cls: "text-green-500", label: "Ativo", icon: CheckCircle },
      suspended: { cls: "text-red-500", label: "Suspenso", icon: XCircle },
    };
    const s = styles[status] || { cls: "text-yellow-500", label: "Trial", icon: Clock };
    return s;
  };

  const formatDate = (dt: string) => {
    if (!dt) return '�';
    return new Date(dt).toLocaleDateString('pt-BR');
  };

  const tabs = [
    { id: 'overview', label: t('Vis�o Geral'), icon: LayoutDashboard },
    { id: 'shops', label: t('Lojas'), icon: Building2 },
    { id: 'financeiro', label: t('Financeiro'), icon: DollarSign },
    { id: 'saque', label: t('Saques'), icon: Banknote },
    { id: 'users', label: t('Usu�rios'), icon: Users },
    { id: 'plans', label: t('Planos'), icon: Crown },
    { id: 'settings', label: t('Configura��es'), icon: Settings }
  ];

  const statsData = [
    { label: t('Lojas Ativas'), val: stats.activeShops.toString(), icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('Receita Mensal (MRR)'), val: formatCurrency(stats.mrr), icon: CreditCard, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: t('Usu�rios Totais'), val: stats.totalUsers.toString(), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: t('Novas Lojas (30d)'), val: stats.newShops30d.toString(), icon: TrendingUp, color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10' }
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      <nav className="h-16 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center px-6 gap-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <span className="text-white font-display font-bold tracking-tight text-lg">KERNEL BARBER SHOPPER</span>
            <span className="text-[#C9A84C] text-xs font-bold ml-2 px-2 py-1 bg-[#C9A84C]/10 rounded-md">SaaS Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto">
<div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border" >
              {loadingSettings ? (
                <Loader2 className="w-4 h-4 text-[#C9A84C] animate-spin" />
              ) : (
                <button
                  onClick={toggleSystem}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    globalSettings?.system_online ? "bg-[#C9A84C] text-[#0A0A0A]" : "bg-[#555] text-[#ddd]"
                  )}
                >
                  {globalSettings?.system_online ? t('Sistema Online') : t('Manuten��o')}
                </button>
              )}
            </div>
          <LanguageSwitcher />
          <button onClick={logout} className="w-10 h-10 rounded-full bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-[#888] hover:text-red-500 hover:border-red-500/30 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest leading-none mb-1">Admin</p>
            <p className="text-xs font-bold text-white leading-none">{user?.displayName || 'Admin'}</p>
          </div>
        </div>
      </nav>

      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">{t('Dashboard SaaS')}</h1>
          <p className="text-[#888] text-sm">{t('Gerencie lojas, usu�rios, planos e monitore a sa�de do sistema.')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsData.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden group hover:border-[#3A3A3A] transition-all">
              <div className={cn("absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20", s.bg)} />
              <div className="relative">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", s.bg)}>
                  <s.icon className={cn("w-5 h-5", s.color)} />
                </div>
                <p className="text-[#888] text-[10px] font-bold uppercase tracking-widest mb-1">{s.label}</p>
                <div className="text-2xl font-bold text-white">{s.val}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-1 mb-8 bg-[#1A1A1A] rounded-2xl p-1.5 border border-[#2A2A2A] w-fit">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-[#C9A84C] text-[#0A0A0A] shadow-lg shadow-[#C9A84C]/20"
                  : "text-[#888] hover:text-white hover:bg-[#2A2A2A]")}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest mb-4">{t('Lojas Recentes')}</h3>
                  <div className="space-y-3">
                    {loading ? <Loader2 className="w-5 h-5 text-[#C9A84C] animate-spin" />
                    : shops.slice(0, 5).map((shop, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#141414] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#2A2A2A] flex items-center justify-center font-bold text-[#888]">{shop.name?.charAt(0) || '?'}</div>
                          <div>
                            <p className="text-sm font-bold text-white">{shop.name}</p>
                            <p className="text-xs text-[#888]">{shop.email}</p>
                          </div>
                        </div>
                        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md", planBadge(shop.plan))}>{shop.plan || 'free'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest mb-4">{t('Planos Ativos')}</h3>
                  <div className="space-y-3">
                    {plans.filter((p: any) => p.isActive).map((plan, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#141414] rounded-xl">
                        <div>
                          <p className="text-sm font-bold text-white">{plan.name}</p>
                          <p className="text-xs text-[#888]">{plan.features?.length || 0} recursos</p>
                        </div>
                        <p className="text-sm font-bold text-[#C9A84C]">{plan.price === 0 ? 'Gr�tis' : formatCurrency(plan.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'shops' && (
            <motion.div key="shops" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-4">
                  <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input type="text" placeholder={t('Buscar lojas...')} value={shopSearch} onChange={(e) => setShopSearch(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                  <button onClick={() => setShowCreateShop(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#C9A84C] text-[#0A0A0A] text-sm font-bold rounded-xl hover:bg-[#D4B84C] transition-all">
                    <Plus className="w-4 h-4" />
                    {t('Nova Loja')}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Loja</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Contato</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Plano</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Expira em</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Status</th>
                        <th className="text-right text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">A��es</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="text-center p-8"><Loader2 className="w-6 h-6 text-[#C9A84C] animate-spin inline" /></td></tr>
                      ) : shops.length === 0 ? (
                        <tr><td colSpan={6} className="text-center p-8 text-[#888] text-sm">Nenhuma loja cadastrada ainda.</td></tr>
                      ) : (
                        shops.filter((s: any) => !shopSearch || s.name?.toLowerCase().includes(shopSearch.toLowerCase()) || s.email?.toLowerCase().includes(shopSearch.toLowerCase())).map((shop, i) => {
                          const st = statusBadge(shop.status);
                          const Icon = st.icon;
                          return (
                            <tr key={shop.id || i} className="border-b border-[#2A2A2A]/50 hover:bg-white/5 transition-all cursor-pointer" onClick={() => openEditShop(shop)}>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-[#2A2A2A] flex items-center justify-center font-bold text-[#888]">{shop.name?.charAt(0) || '?'}</div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{shop.name}</p>
                                    <p className="text-xs text-[#888]">{shop.id?.slice(0, 8)}...</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-[#eee]">{shop.email || shop.owner_id || 'N/A'}</td>
                              <td className="p-4">
                                  <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md", planBadge(shop.plan))}>
                                  {shop.plan || 'free'}</span>
                              </td>
                              <td className="p-4 text-sm text-[#eee]">
                                {shop.plan_expires_at ? (
                                  <span className={new Date(shop.plan_expires_at) < new Date() ? 'text-red-400' : 'text-[#888]'}>
                                    {formatDate(shop.plan_expires_at)}
                                    {new Date(shop.plan_expires_at) < new Date() && ' (vencido)'}
                                  </span>
                                ) : <span className="text-[#555]">�</span>}
                              </td>
                              <td className="p-4">
                                <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold", st.cls)}>
                                  <Icon className="w-3 h-3" />
                                  {st.label}
                                </span>
                              </td>
                              <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleToggleShopStatus(shop)}
                                  className={cn("text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all",
                                    shop.status === 'active' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-green-500/10 text-green-500 hover:bg-green-500/20")}>
                                  {shop.status === 'active' ? 'Suspender' : 'Ativar'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* CREATE SHOP MODAL */}
          {showCreateShop && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateShop(false)}>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-white mb-6">Nova Loja</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-1">{t('Nome da Loja')}</label>
                    <input value={newShopForm.name} onChange={(e) => setNewShopForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Barbearia Souza" className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-1">{t('Email do Dono')}</label>
                    <input value={newShopForm.ownerEmail} onChange={(e) => setNewShopForm(p => ({ ...p, ownerEmail: e.target.value }))}
                      placeholder="email@dono.com" className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-1">{t('Plano')}</label>
                    <select value={newShopForm.plan} onChange={(e) => setNewShopForm(p => ({ ...p, plan: e.target.value }))}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]">
                      <option value="free">Free</option>
                      <option value="basic">Prata</option>
                      <option value="pro">Gold</option>
                      <option value="enterprise">Enterprise PRO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-1">{t('Dura��o (dias)')}</label>
                    <input type="number" min={1} max={3650} value={newShopForm.durationDays} onChange={(e) => setNewShopForm(p => ({ ...p, durationDays: Number(e.target.value) }))}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
<button onClick={() => setShowCreateShop(false)}
                     className="flex-1 px-4 py-2.5 text-sm font-bold text-[#888] bg-[#141414] rounded-xl hover:bg-[#2A2A2A] transition-all">{t('Cancelar')}</button>
                  <button onClick={handleCreateShop} disabled={creating || !newShopForm.name || !newShopForm.ownerEmail}
                    className="flex-1 px-4 py-2.5 text-sm font-bold bg-[#C9A84C] text-[#0A0A0A] rounded-xl hover:bg-[#D4B84C] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {creating ? t('Criando...') : t('Criar Loja')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDIT SHOP MODAL */}
          {editingShop && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setEditingShop(null)}>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-white mb-1">{editingShop.name}</h2>
                <p className="text-xs text-[#888] mb-6">ID: {editingShop.id}</p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-3 bg-[#141414] rounded-xl">
                    <span className="text-xs text-[#888]">Email</span>
                    <span className="text-sm text-white font-medium">{editingShop.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#141414] rounded-xl">
                    <span className="text-xs text-[#888]">Status</span>
                    <span className={cn("text-sm font-bold", editingShop.status === 'active' ? 'text-green-400' : 'text-red-400')}>
                      {editingShop.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#141414] rounded-xl">
                    <span className="text-xs text-[#888]">Plano atual</span>
                    <span className={cn("text-sm font-bold uppercase", planBadge(editingShop.plan))}>{editingShop.plan || 'free'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#141414] rounded-xl">
                    <span className="text-xs text-[#888]">Expira em</span>
                    <span className="text-sm text-white">{editingShop.plan_expires_at ? formatDate(editingShop.plan_expires_at) : '�'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#141414] rounded-xl">
                    <span className="text-xs text-[#888]">Criada em</span>
                    <span className="text-sm text-white">{formatDate(editingShop.created_at)}</span>
                  </div>
                </div>
                <div className="border-t border-[#2A2A2A] pt-4">
                  <h3 className="text-xs font-bold text-[#888] uppercase tracking-widest mb-3">Alterar Plano</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#888] mb-1">Novo plano</label>
                      <select value={editPlanForm.plan} onChange={(e) => setEditPlanForm(p => ({ ...p, plan: e.target.value }))}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]">
                        <option value="free">Free</option>
                        <option value="basic">Prata</option>
                        <option value="pro">Gold</option>
                        <option value="enterprise">Enterprise PRO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#888] mb-1">Renovar por (dias)</label>
                      <input type="number" min={1} max={3650} value={editPlanForm.durationDays} onChange={(e) => setEditPlanForm(p => ({ ...p, durationDays: Number(e.target.value) }))}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleDeleteShop}
                    className="px-4 py-2.5 text-sm font-bold text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all">Excluir</button>
                  <div className="flex-1 flex gap-3">
                    <button onClick={() => setEditingShop(null)}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-[#888] bg-[#141414] rounded-xl hover:bg-[#2A2A2A] transition-all">Fechar</button>
                    <button onClick={handleEditPlan}
                      className="flex-1 px-4 py-2.5 text-sm font-bold bg-[#C9A84C] text-[#0A0A0A] rounded-xl hover:bg-[#D4B84C] transition-all">Salvar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#2A2A2A]">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input type="text" placeholder={t('Buscar usu�rios...')} value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Usu�rio</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Email</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Fun��o</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Loja</th>
                        <th className="text-right text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">A��es</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="text-center p-8"><Loader2 className="w-6 h-6 text-[#C9A84C] animate-spin inline" /></td></tr>
                      ) : (
                        <>
                          {users.filter((u: any) => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map((u: any, i: number) => (
                            <tr key={u.id || `root-${i}`} className="border-b border-[#2A2A2A]/50 hover:bg-white/5 transition-all">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9A7A30] flex items-center justify-center text-xs font-bold text-[#0A0A0A]">
                                    {(u.email || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{u.email?.split('@')[0] || 'Sem nome'}</p>
                                    <p className="text-xs text-[#888]">ID: {u.id?.slice(0, 8)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-[#eee]">{u.email}</td>
                              <td className="p-4">
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-[#C9A84C]/20 text-[#C9A84C]">admin</span>
                              </td>
                              <td className="p-4 text-xs text-[#888]">Root</td>
                              <td className="p-4 text-right">
                                {u.email !== 'kernelbarbershopper@gmail.com' && (
                                  <button onClick={() => handleDeleteUser(u.id)}
                                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                                    <Trash2 className="w-3 h-3 inline mr-1" />Deletar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {allUsers.filter((u: any) => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map((u: any, i: number) => (
                            <tr key={u.id || `shop-${i}`} className="border-b border-[#2A2A2A]/50 hover:bg-white/5 transition-all">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{u.name || 'Sem nome'}</p>
                                    <p className="text-xs text-[#888]">ID: {u.id?.slice(0, 8)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-[#eee]">{u.email || 'N/A'}</td>
                              <td className="p-4">
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-blue-500/20 text-blue-400">barber</span>
                              </td>
                              <td className="p-4 text-xs text-[#888]">{u.shopId?.slice(0, 8) || 'N/A'}</td>
                              <td className="p-4 text-right"><span className="text-[10px] text-[#666]">Shop user</span></td>
                            </tr>
                          ))}
                          {users.length === 0 && allUsers.length === 0 && (
                            <tr><td colSpan={5} className="text-center p-8 text-[#888] text-sm">Nenhum usu�rio cadastrado ainda.</td></tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'financeiro' && (
            <motion.div key="financeiro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Receita Total', val: formatCurrency(payments.reduce((s, p) => s + Number(p.amount || 0), 0) + subscriptions.reduce((s, p) => s + Number(p.value || 0), 0)), icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
                  { label: 'Receita Recorrente (MRR)', val: formatCurrency(stats.mrr), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Assinaturas Ativas', val: subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'active').length.toString(), icon: Crown, color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10' },
                  { label: 'Saques Pendentes', val: withdrawals.filter(w => w.status === 'pending').length.toString(), icon: Banknote, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden">
                    <div className={cn("absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20", s.bg)} />
                    <div className="relative">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", s.bg)}><s.icon className={cn("w-5 h-5", s.color)} /></div>
                      <p className="text-[#888] text-[10px] font-bold uppercase tracking-widest mb-1">{s.label}</p>
                      <div className="text-2xl font-bold text-white">{s.val}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest mb-4">Receita por Loja</h3>
                  <div className="space-y-3">
                    {shops.length === 0 ? (
                      <p className="text-[#888] text-sm text-center py-4">Nenhuma loja cadastrada</p>
                    ) : shops.map((shop, i) => {
                      const totalPaid = [...payments.filter(p => shop.email && p.email === shop.email), ...subscriptions.filter(s => shop.email && s.email === shop.email)]
                        .reduce((s, p) => s + Number(p.amount || p.value || 0), 0);
                      const lastPay = [...payments.filter(p => shop.email && p.email === shop.email), ...subscriptions.filter(s => shop.email && s.email === shop.email)]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                      const planName = plans.find(p => p.id === shop.plan)?.name || shop.plan || 'free';
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#141414] rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#2A2A2A] flex items-center justify-center font-bold text-[#888]">{shop.name?.charAt(0) || '?'}</div>
                            <div>
                              <p className="text-sm font-bold text-white">{shop.name}</p>
                              <p className="text-xs text-[#888]">{planName} {lastPay ? `� �ltimo: ${formatDate(lastPay.created_at)}` : ''}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-green-500">{formatCurrency(totalPaid)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest mb-4">�ltimas Transa��es</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {[...payments.map(p => ({ ...p, type: 'payment' })), ...subscriptions.map(s => ({ ...s, type: 'subscription' }))]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 20).map((t, i) => {
                        const statusStyles: Record<string, string> = { CONFIRMED: 'text-green-500', ACTIVE: 'text-green-500', PENDING: 'text-yellow-500', pending: 'text-yellow-500', RECEIVED: 'text-green-500', OVERDUE: 'text-red-500' };
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-[#141414] rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold", t.type === 'subscription' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400")}>
                                {t.type === 'subscription' ? 'S' : 'P'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{t.email || 'N/A'}</p>
                                <p className="text-[10px] text-[#888]">{t.type === 'subscription' ? 'Assinatura' : 'Pagamento'} � {formatDate(t.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-white">{formatCurrency(t.amount || t.value || 0)}</p>
                              <p className={cn("text-[10px] font-bold", statusStyles[t.status] || 'text-[#888]')}>{t.status}</p>
                            </div>
                          </div>
                        );
                      })}
                    {payments.length === 0 && subscriptions.length === 0 && <p className="text-[#888] text-sm text-center py-4">Nenhuma transa��o ainda</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'saque' && (
            <motion.div key="saque" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#2A2A2A]">
                  <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest">Solicita��es de Saque</h3>
                  <p className="text-xs text-[#555] mt-1">Gerencie os pedidos de saque das lojas</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Loja</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Valor</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Chave PIX</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Data</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">Status</th>
                        <th className="text-right text-[10px] font-bold uppercase tracking-widest text-[#888] p-4">A��es</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length === 0 ? (
                        <tr><td colSpan={6} className="text-center p-8 text-[#888] text-sm">Nenhuma solicita��o de saque ainda.</td></tr>
                      ) : withdrawals.map((wd, i) => {
                        const st = { pending: { cls: 'text-yellow-500', label: 'Pendente' }, approved: { cls: 'text-green-500', label: 'Aprovado' }, rejected: { cls: 'text-red-500', label: 'Recusado' } }[wd.status] || { cls: 'text-[#888]', label: wd.status };
                        return (
                          <tr key={wd.id || i} className="border-b border-[#2A2A2A]/50 hover:bg-white/5 transition-all">
                            <td className="p-4">
                              <p className="text-sm font-bold text-white">{wd.shops?.name || wd.shop_id?.slice(0, 8) || 'N/A'}</p>
                              <p className="text-xs text-[#888]">{wd.shops?.email || ''}</p>
                            </td>
                            <td className="p-4 text-sm font-bold text-white">{formatCurrency(wd.amount)}</td>
                            <td className="p-4 text-xs text-[#eee] font-mono">{wd.pix_key || '�'}</td>
                            <td className="p-4 text-sm text-[#888]">{formatDate(wd.requested_at)}</td>
                            <td className="p-4">
                              <span className={cn("text-[10px] font-bold", st.cls)}>{st.label}</span>
                              {wd.admin_note && <p className="text-[9px] text-[#555] mt-0.5">Obs: {wd.admin_note}</p>}
                            </td>
                            <td className="p-4 text-right">
                              {wd.status === 'pending' && (
                                <div className="flex gap-2 justify-end">
                                  <button onClick={async () => { const note = prompt('Observa��o (opcional):'); await approveWithdrawal(wd.id, note || undefined); }}
                                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all">
                                    Aprovar
                                  </button>
                                  <button onClick={async () => { const note = prompt('Motivo da recusa:'); await rejectWithdrawal(wd.id, note || undefined); }}
                                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                                    Recusar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'plans' && <PlansManagement plans={plans} onAddPlan={addPlan} onUpdatePlan={updatePlan} onDeletePlan={deletePlan} formatCurrency={formatCurrency} />}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest mb-4">Integra��es</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#141414] rounded-xl">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                             <CreditCard className="w-5 h-5 text-blue-500" />
                           </div>
                           <div>
                             <p className="text-sm font-bold text-white">Asaas</p>
                             <p className="text-xs text-[#888]">Pagamentos via PIX, Boleto e Cart�o</p>
                           </div>
                         </div>
                         <span className="text-xs font-bold px-2 py-1 rounded-md bg-green-500/10 text-green-500">
                           Configurado
                         </span>
                       </div>
                       <div className="p-4 bg-[#141414] rounded-xl border border-[#2A2A2A]">
                         <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-2">Webhook URL (Asaas)</label>
                         <div className="flex items-center gap-2">
                           <code className="text-[#C9A84C] text-xs flex-1 break-all">
                             {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook
                           </code>
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(`${window.location.origin}/api/webhook`);
                             }}
                             className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#2A2A2A] text-[#888] hover:text-white transition-all"
                           >
                             Copiar
                           </button>
                         </div>
                         <p className="text-[10px] text-[#555] mt-2">Configure este URL no painel do Asaas &gt; Integra��es &gt; Webhook</p>
                       </div>
                       <div className="p-4 bg-[#141414] rounded-xl border border-[#2A2A2A]">
                         <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-2">Chave API (Backend)</label>
                         <p className="text-xs text-[#888] mb-2">Configure no Vercel Environment Variables:</p>
                         <code className="text-[#C9A84C] text-[10px] bg-[#1A1A1A] px-2 py-1 rounded block">
                           ASAAS_API_KEY
                         </code>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6">Estat�sticas do Sistema</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-[#141414] rounded-xl">
                      <span className="text-sm text-[#888]">Total de Lojas</span>
                      <span className="text-sm font-bold text-white">{shops.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#141414] rounded-xl">
                      <span className="text-sm text-[#888]">Lojas Ativas</span>
                      <span className="text-sm font-bold text-green-500">{shops.filter(s => s.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#141414] rounded-xl">
                      <span className="text-sm text-[#888]">Lojas Suspensas</span>
                      <span className="text-sm font-bold text-red-400">{shops.filter(s => s.status === 'suspended').length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#141414] rounded-xl">
                      <span className="text-sm text-[#888]">Total de Planos</span>
                      <span className="text-sm font-bold text-white">{plans.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#141414] rounded-xl">
                      <span className="text-sm text-[#888]">Total de Usu�rios</span>
                      <span className="text-sm font-bold text-white">{users.length + allUsers.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#141414] rounded-xl">
                      <span className="text-sm text-[#888]">MRR Atual</span>
                      <span className="text-sm font-bold text-[#C9A84C]">{formatCurrency(stats.mrr)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { t } = useLocale();
  const { login, register } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [timer, setTimer] = React.useState(3600);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [plans, setPlans] = React.useState<any[]>([]);
  const formRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const unsub = subscribeToPlans<any>((data) => {
      setPlans(data.filter((p: any) => p.isActive !== false));
    });
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const fakeNames = [
    'Jo�o Silva', 'Carlos Oliveira', 'Pedro Santos', 'Lucas Costa', 'Ana Souza',
    'Rafael Lima', 'Marcos Pereira', 'Gabriel Alves', 'Thiago Martins', 'Felipe Rocha',
    'Andr� Gomes', 'Bruno Barbosa', 'Eduardo Teixeira', 'Diego Correia', 'Igor Nunes',
  ];
  const usedNames = React.useRef(new Set());

  React.useEffect(() => {
    const showNotification = () => {
      let name: string;
      do { name = fakeNames[Math.floor(Math.random() * fakeNames.length)]; } while (usedNames.current.has(name));
      usedNames.current.add(name);
      if (usedNames.current.size === fakeNames.length) usedNames.current.clear();

      const paidPlans = plans.filter((p: any) => p.price > 0);
      const randomPlan = paidPlans.length > 0
        ? paidPlans[Math.floor(Math.random() * paidPlans.length)]
        : { name: 'Gold' };
      const notif = {
        id: Date.now(),
        name,
        plan: randomPlan.name,
        time: 'agora mesmo',
      };
      setNotifications((prev) => [notif, ...prev].slice(0, 5));
      setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id)), 6000);
    };

    showNotification();
    const notificationInterval = setInterval(showNotification, 8000 + Math.random() * 12000);
    return () => clearInterval(notificationInterval);
  }, [plans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await register(email, password);
        localStorage.setItem('redirectToPricing', 'true');
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const min = Math.floor(timer / 60);
  const seg = timer % 60;

  const enterprise = plans.find((p) => p.id === 'enterprise');

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      {/* Fake purchase notifications */}
      <div className="fixed bottom-4 left-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            className="bg-[#1A1A1A] border border-[#C9A84C]/30 rounded-xl px-4 py-3 shadow-2xl shadow-[#C9A84C]/10 flex items-center gap-3 max-w-xs"
          >
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{n.name}</p>
              <p className="text-[10px] text-[#C9A84C]">{n.plan} � {n.time}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Notification Bar */}
      <div className="bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A0A0A] text-center py-2.5 px-4 sticky top-0 z-40">
<p className="text-xs font-black uppercase tracking-widest">{t('PROMO��O REL�MPAGO � PRIMEIRAS 12 VAGAS �')} {String(min).padStart(2, '0')}:{String(seg).padStart(2, '0')}</p>
      </div>

      {/* Hero + Login */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left">
          <img src="/logo.png" alt="KERNEL BARBER SHOPPER" className="w-16 h-16 rounded-2xl object-cover mx-auto lg:mx-0 mb-6 shadow-2xl shadow-[#C9A84C]/30" />
          <h1 className="text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight leading-tight">
            KERNEL<br />
            <span className="text-[#C9A84C]">BEAUTY SHOPPER</span>
          </h1>
<p className="text-[#888] text-lg max-w-lg mx-auto lg:mx-0 mb-8">{t('A gest�o de luxo para sua barbearia, agora com intelig�ncia artificial.')}</p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            <div className="flex items-center gap-2 text-sm text-[#eee] bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[#2A2A2A]">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> {t('IA Assistente')}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#eee] bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[#2A2A2A]">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> {t('Loja Online')}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#eee] bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[#2A2A2A]">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> {t('Kit Profissional Gr�tis')}
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm" ref={formRef}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141414] border border-[#2A2A2A] rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#C9A84C]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#C9A84C]/5 rounded-full blur-3xl" />
            <div className="relative">
              <p className="text-[10px] text-[#C9A84C] font-bold uppercase tracking-[3px] mb-2">
                {isRegistering ? t('CRIAR CONTA') : t('ACESSAR')}
              </p>
              <h2 className="text-2xl font-bold text-white mb-8">
                {isRegistering ? t('Fa�a seu cadastro') : t('Bem-vinda de volta')}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-all text-white placeholder-[#555]" required />
                <input type="password" placeholder="Senha" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-all text-white placeholder-[#555]" required />
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A0A0A] py-4 rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-xl disabled:opacity-50 text-sm">
                  {loading ? t('Aguarde...') : (isRegistering ? t('Cadastrar Gr�tis') : t('Entrar'))}
                </button>
              </form>
              <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="mt-4 text-xs text-[#888] hover:text-[#C9A84C] transition-all w-full text-center">
                {isRegistering ? t('J� tem conta? Entrar') : t('N�o tem conta? Cadastre-se')}
              </button>
              {isRegistering && (
                <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-green-500 text-xs font-bold">?? Cadastre-se agora e garanta sua Kit Profissional Gr�tis!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Fake counter */}
          <div className="mt-4 text-center">
            <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold">
              ?? Vagas promocionais restantes
            </p>
            <div className="flex justify-center gap-3 mt-2">
              {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n, i) => (
                <div key={i} className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border",
                  n > 2
                    ? "bg-[#C9A84C]/20 border-[#C9A84C]/40 text-[#C9A84C]"
                    : "bg-[#1A1A1A] border-[#2A2A2A] text-[#555] line-through"
                )}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <p className="text-[10px] text-[#C9A84C] font-bold uppercase tracking-[3px] mb-2">Planos</p>
          <h2 className="text-3xl font-display font-bold text-white mb-2">
            Escolha o melhor para seu <span className="text-[#C9A84C]">sal�o</span>
          </h2>
            <p className="text-[#888] text-sm">As primeiras 12 pessoas ganham condi��es especiais!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => {
            const isFree = plan.price === 0;
            const isEnterprise = plan.id === 'enterprise' || plan.price >= 129;
            const isGold = plan.id === 'pro' || (Number(plan.price) >= 70 && Number(plan.price) < 129);
            const isPopular = isGold;
            return (
              <div key={plan.id || i}
                className={cn(
                  "relative bg-[#141414] border rounded-2xl p-6 transition-all hover:scale-[1.02]",
                  isEnterprise ? "border-[#C9A84C] shadow-lg shadow-[#C9A84C]/30 ring-2 ring-[#C9A84C]/50" :
                  isPopular ? "border-[#C9A84C] shadow-lg shadow-[#C9A84C]/20" : "border-[#2A2A2A] hover:border-[#3A3A3A]",
                  isFree && "border-green-500/50"
                )}
              >
                {isEnterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A0A0A] text-[9px] font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                    ?? Kit Profissional Gr�tis
                  </div>
                )}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C9A84C] text-[#0A0A0A] text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Mais Popular</div>
                )}
                {isFree && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-[#0A0A0A] text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Gr�tis</div>
                )}
                <div className="text-center mb-6">
                  {isEnterprise && <p className="text-[8px] text-[#C9A84C] font-bold uppercase tracking-[3px] mb-1">RECOMENDADO</p>}
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    {isFree ? (
                      <span className="text-4xl font-bold text-green-400">Gr�tis</span>
                    ) : (
                      <>
                        {isEnterprise && (
                          <p className="text-[10px] text-[#555] line-through mb-1">De {formatCurrency(249.90)}</p>
                        )}
                        <span className="text-4xl font-bold text-[#C9A84C]">{formatCurrency(plan.price)}</span>
                        <span className="text-[#888] text-sm ml-1">/{plan.interval === 'yearly' ? 'ano' : 'm�s'}</span>
                      </>
                    )}
                  </div>
                  {isEnterprise && (
                    <div className="bg-gradient-to-r from-[#C9A84C]/20 to-[#E8C96A]/10 border border-[#C9A84C]/30 rounded-xl p-3 my-3">
                      <p className="text-[#C9A84C] font-bold text-sm">?? M�quina Personalizada com sua Logo</p>
                      <p className="text-[10px] text-[#888]">Gr�tis! Sua marca na m�quina</p>
                    </div>
                  )}
                  {isGold && (
                    <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/10 border border-orange-500/30 rounded-xl p-3 my-3">
                      <p className="text-orange-400 font-bold text-sm">?? Primeiros 10 levam Kit Profissional Gr�tis!</p>
                      <p className="text-[10px] text-[#888]">Personaliz�vel com sua marca</p>
                    </div>
                  )}
                  {plan.trialDays > 0 && <p className="text-[10px] text-[#C9A84C] font-bold">{plan.trialDays} dias gr�tis</p>}
                </div>
                <div className="space-y-3 mb-6">
                  {plan.features?.map((f: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-[#eee]">
                      <CheckCircle2 className={cn("w-4 h-4 shrink-0", isEnterprise ? "text-[#C9A84C]" : "text-green-500")} />
                      {f}
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  formRef.current?.scrollIntoView({ behavior: 'smooth' });
                  setIsRegistering(true);
                }}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm transition-all",
                    isEnterprise
                      ? "bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A0A0A] hover:brightness-110 shadow-lg shadow-[#C9A84C]/30"
                      : isFree
                        ? "bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20"
                        : "bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:bg-[#222]"
                  )}
                >
                  {isFree ? 'Come�ar Gr�tis' : isEnterprise ? 'Garantir Oferta' : 'Assinar'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] py-6 text-center">
        <p className="text-[10px] text-[#555] uppercase tracking-widest font-bold">
          Enterprise Edition / 2026 � Desenvolvido por Michael Mariano / 2026
        </p>
      </footer>
    </div>
  );
}

function AppContent() {
  const { t } = useLocale();
  const { user, loading } = useAuth();
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    setCheckingAuth(false);
  }, []);

  // Public store page - bypass auth
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isPublicStore = params?.has('loja');

  if (isPublicStore) {
    return <LojaOnlineView />;
  }

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  return user ? <MainApp /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        closeButton
        toastOptions={{ duration: 4000 }}
      />
    </AuthProvider>
  );
}

function WelcomeMachineView({ shopId, onNavigate }: { shopId: string; onNavigate: (v: View) => void }) {
  const [step, setStep] = React.useState<'welcome' | 'form' | 'done'>('welcome');
  const [form, setForm] = React.useState({
    full_name: '', phone: '', address: '', city: '', state: '', zip_code: '',
    logo_url: '', needs_logo_design: false, notes: ''
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, logo_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone || !form.address || !form.city || !form.state || !form.zip_code) {
      setError('Preencha todos os campos obrigat�rios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveMachineRequest(shopId, form);
      setStep('done');
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'done') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto text-center py-20 px-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-3">Tudo pronto! ??</h1>
        <p className="text-[#888] text-lg mb-2">Sua solicita��o foi enviada com sucesso.</p>
        <p className="text-[#888] mb-8">Vamos preparar sua m�quina personalizada. Voc� receber� atualiza��es por aqui!</p>
        <button onClick={() => onNavigate('dashboard')}
          className="bg-[#C9A84C] text-[#0A0A0A] px-8 py-3 rounded-xl font-bold hover:bg-[#E8C96A] transition-all">
          Ir para o Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {step === 'welcome' ? (
        <>
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center mx-auto">
              <Crown className="w-10 h-10 text-[#0A0A0A]" />
            </div>
            <h1 className="text-3xl font-bold text-white">Parab�ns pelo plano! ??</h1>
            <p className="text-[#888] text-lg">Voc� ganhou uma <strong className="text-[#C9A84C]">m�quina personalizada</strong> com a logo da sua barbearia!</p>
            <div className="bg-gradient-to-r from-[#C9A84C]/10 to-transparent border border-[#C9A84C]/20 rounded-2xl p-6 mt-6">
              <p className="text-white text-sm leading-relaxed">
                Preencha seus dados de envio abaixo e, se tiver uma logo, envie tamb�m. 
                <strong className="text-[#C9A84C]"> Se n�o tiver logo, n�o se preocupe!</strong> 
                Nossa equipe cria uma <strong className="text-[#C9A84C]">logo profissional gratuitamente</strong> para voc�.
              </p>
            </div>
            <button onClick={() => setStep('form')}
              className="mt-6 bg-[#C9A84C] text-[#0A0A0A] px-8 py-3 rounded-xl font-bold text-lg hover:bg-[#E8C96A] transition-all">
              Preencher Dados de Envio
            </button>
          </div>
        </>
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6 text-[#C9A84C]" />
            <h2 className="text-xl font-bold text-white">Dados para Envio da M�quina</h2>
          </div>
          <p className="text-[#888] text-sm">Preencha corretamente para receber sua m�quina personalizada.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-500 text-xs font-bold">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-[#888] font-bold mb-1">Nome completo *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-bold mb-1">Telefone / WhatsApp *</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-bold mb-1">CEP *</label>
              <input value={form.zip_code} onChange={e => setForm(f => ({ ...f, zip_code: e.target.value }))}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-[#888] font-bold mb-1">Endere�o completo *</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-bold mb-1">Cidade *</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="block text-xs text-[#888] font-bold mb-1">Estado *</label>
              <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} maxLength={2}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] pt-6 space-y-4">
            <h3 className="font-bold text-white">Logo da sua Barbearia</h3>
            <div className="flex items-center gap-4">
              {form.logo_url ? (
                <div className="relative">
                  <img src={form.logo_url} className="w-20 h-20 rounded-xl object-cover border border-[#2A2A2A]" />
                  <button onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">X</button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl bg-[#141414] border border-dashed border-[#2A2A2A] flex items-center justify-center cursor-pointer hover:border-[#C9A84C] transition-colors">
                  <Plus className="w-6 h-6 text-[#555]" />
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-white">Fa�a upload da sua logo</p>
                <p className="text-[10px] text-[#888]">PNG, JPG ou SVG. M�x 5MB.</p>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-[#141414] rounded-xl cursor-pointer hover:bg-[#1A1A1A] transition-colors">
              <input type="checkbox" checked={form.needs_logo_design} onChange={e => setForm(f => ({ ...f, needs_logo_design: e.target.checked }))}
                className="w-4 h-4 accent-[#C9A84C]" />
              <div>
                <p className="text-sm font-bold text-white">N�o tenho logo</p>
                <p className="text-[10px] text-[#C9A84C]">Nossa equipe cria uma logo profissional GR�TIS para voc�!</p>
              </div>
            </label>

            <div className="md:col-span-2">
              <label className="block text-xs text-[#888] font-bold mb-1">Observa��es (opcional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C] resize-none" />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving}
            className="w-full py-4 bg-[#C9A84C] text-[#0A0A0A] rounded-xl font-bold text-base hover:bg-[#E8C96A] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {saving ? 'Enviando...' : 'Enviar Dados'}
          </button>

          <button onClick={() => onNavigate('dashboard')}
            className="w-full py-3 text-[#888] text-sm hover:text-white transition-colors">
            Pular por enquanto (fa�o depois)
          </button>
        </div>
      )}
    </motion.div>
  );
}

function DashboardView({ onNavigate, shopId }: { onNavigate: (v: View) => void, shopId: string }) {
  const [metrics, setMetrics] = React.useState({
    revenue: 0,
    appointments: 0,
    pendingAppointments: 0,
    newClients: 0,
    avgRating: 0,
    totalReviews: 0
  });
  const [balance, setBalance] = React.useState(0);
  const [showSaque, setShowSaque] = React.useState(false);
  const [saqueValor, setSaqueValor] = React.useState('');
  const [saquePix, setSaquePix] = React.useState('');
  const [saqueLoading, setSaqueLoading] = React.useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = React.useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = React.useState<any[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = React.useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    const fmtDate = (dt: string) => dt.split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const unsubAppointments = subscribeToAppointments(shopId, (data) => {
       const todayApps = data.filter((a: any) => fmtDate(a.date) === today);
       const pending = todayApps.filter((a: any) => a.status === 'pending' || a.status === 'confirmed').length;
      
      setUpcomingAppointments(todayApps.slice(0, 4));
      setMetrics(prev => ({
        ...prev,
        appointments: todayApps.length,
        pendingAppointments: pending
      }));
      setLoading(false);
    });

    const unsubStock = subscribeToCollection('inventory', (data) => {
      const alerts = data.filter((item: any) => (item.quantity || 0) <= 5);
      setStockAlerts(alerts.slice(0, 4));
    }, shopId);

    const fetchBalance = async () => {
      try {
        const { data } = await supabase.from('shops').select('balance').eq('id', shopId).single();
        setBalance(Number(data?.balance || 0));
      } catch {}
    };
    fetchBalance();

    const fetchRealMetrics = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
        
        const allApps = await new Promise<any[]>((resolve) => {
          subscribeToAppointments(shopId, resolve);
        });
        
        const recentApps = allApps.filter((a: any) => fmtDate(a.date) >= dateStr && a.status === 'confirmed');
        const revenue = recentApps.reduce((sum: number, app: any) => sum + (Number(app.service_price) || 0), 0);
        const uniqueClients = new Set(recentApps.map((a: any) => a.user_phone || a.user_name));
        
        setMetrics(prev => ({
          ...prev,
          revenue,
          newClients: uniqueClients.size,
          avgRating: 0,
          totalReviews: 0
        }));
        
        const weekRev = [0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 7; i++) {
          const day = new Date();
          day.setDate(day.getDate() - (6 - i));
          const dayStr = day.toISOString().split('T')[0];
          const dayApps = allApps.filter((a: any) => fmtDate(a.date) === dayStr && a.status === 'confirmed');
          weekRev[i] = dayApps.reduce((sum: number, app: any) => sum + (Number(app.service_price) || 0), 0);
        }
        setWeeklyRevenue(weekRev);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };
    
    fetchRealMetrics();

    return () => {
      unsubAppointments();
      unsubStock();
    };
  }, [shopId]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#C9A84C]">Vis�o Geral</h1>
          <p className="text-[#888] text-sm">Bem-vindo ao KERNEL BARBER SHOPPER, seu painel do dia.</p>
        </div>
        <button className="bg-[#C9A84C] text-[#0A0A0A] px-5 py-2.5 rounded-xl font-semibold text-sm hover:scale-[1.02] active:scale-95 transition-all">
          Baixar Relat�rio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
          <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Saldo Dispon�vel</p>
          <div className="text-2xl font-bold text-[#E8C96A]">${balance.toFixed(2)}</div>
          <button onClick={() => setShowSaque(true)} disabled={balance <= 0}
            className="mt-3 w-full text-[10px] font-bold py-2 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            {balance > 0 ? 'Solicitar Saque' : 'Sem saldo dispon�vel'}
          </button>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
          <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Agendamentos Hoje</p>
          <div className="text-2xl font-bold text-[#E8C96A]">{metrics.appointments}</div>
          <p className="text-[10px] mt-1 font-medium text-green-500">{metrics.pendingAppointments} pendentes</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
          <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Clientes (30d)</p>
          <div className="text-2xl font-bold text-[#E8C96A]">{metrics.newClients}</div>
          <p className="text-[10px] mt-1 font-medium text-[#888]">Clientes �nicos</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
          <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Avalia��o</p>
          <div className="text-2xl font-bold text-[#E8C96A]">{metrics.avgRating > 0 ? `${metrics.avgRating} ?` : 'N/A'}</div>
          <p className="text-[10px] mt-1 font-medium text-[#888]">{metrics.totalReviews} avalia��es</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Pr�ximos Agendamentos" action="Ver agenda" onAction={() => onNavigate('agenda')}>
          {loading ? (
            <div className="p-4 text-center text-[#888]">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="p-4 text-center text-[#888] text-sm">
              Nenhum agendamento para hoje
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((app, i) => (
                <AgendaRow 
                  key={app.id || i} 
                  status={app.status === 'confirmed' ? 'ok' : 'wait'} 
                  time={app.time} 
                  client={app.clientName} 
                  service={app.service} 
                  barber={app.barber} 
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="Alertas de Estoque" action="Ver estoque" onAction={() => onNavigate('estoque')}>
          {stockAlerts.length === 0 ? (
            <div className="p-4 text-center text-[#888] text-sm">
              Estoque ok, sem alertas
            </div>
          ) : (
            <div className="space-y-4">
              {stockAlerts.map((item, i) => (
                <StockAlert 
                  key={item.id || i} 
                  status={item.quantity <= 2 ? 'critical' : 'low'} 
                  item={item.name} 
                  qty={`${item.quantity} un`} 
                />
              ))}
            </div>
          )}
          <button 
            onClick={() => onNavigate('ia')}
            className="w-full mt-6 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 py-3 rounded-xl text-sm font-medium hover:bg-[#C9A84C]/20 transition-all flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4" />
            Analisar Reposi��o com IA
          </button>
        </Card>
      </div>

      <Card title="Receita Semanal">
        <div className="h-48 flex items-end gap-3 pt-6">
          {weeklyRevenue.map((h, i) => {
            const maxVal = Math.max(...weeklyRevenue, 1);
            const percentage = maxVal > 0 ? (h / maxVal) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${percentage}%` }}
                  className={cn(
                    "w-full rounded-t-lg transition-all",
                    h > 0 ? "bg-[#C9A84C]" : "bg-[#2A2A2A]"
                  )}
                />
                <span className="text-[10px] text-[#888] font-medium">{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* APK Download */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#141414] border border-[#C9A84C]/20 rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-[#C9A84C]" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">App Android</p>
            <p className="text-[10px] text-[#888]">Baixe o APK e acesse do celular</p>
          </div>
        </div>
        <a href="/downloads/KernelBarberShopper.apk" download
          className="bg-[#C9A84C] text-[#0A0A0A] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#E8C96A] transition-all flex items-center gap-2 shrink-0">
          <Download className="w-4 h-4" /> Baixar APK
        </a>
      </div>

      {showSaque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSaque(false)}>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-2">Solicitar Saque</h2>
            <p className="text-sm text-[#888] mb-6">Seu saldo dispon�vel: <span className="text-[#C9A84C] font-bold">${balance.toFixed(2)}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-1">Valor do Saque</label>
                <input type="number" min={1} max={balance} value={saqueValor} onChange={e => setSaqueValor(e.target.value)}
                  placeholder="0.00" className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#888] uppercase tracking-widest mb-1">Chave PIX</label>
                <input type="text" value={saquePix} onChange={e => setSaquePix(e.target.value)}
                  placeholder="CPF, email, telefone ou chave aleat�ria" className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSaque(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-[#888] bg-[#141414] rounded-xl hover:bg-[#2A2A2A] transition-all">Cancelar</button>
              <button onClick={async () => {
                const valor = Number(saqueValor);
                if (!valor || valor <= 0 || valor > balance) { toast.error('Valor inv�lido'); return; }
                if (!saquePix.trim()) { toast.error('Informe a chave PIX'); return; }
                setSaqueLoading(true);
                try {
                  await requestWithdrawal(shopId, valor, saquePix.trim());
                  toast.error('Solicita��o de saque enviada! O admin ir� analisar.');
                  setShowSaque(false);
                  setSaqueValor('');
                  setSaquePix('');
                  const { data } = await supabase.from('shops').select('balance').eq('id', shopId).single();
                  setBalance(Number(data?.balance || 0));
                } catch (e: any) {
                  toast.error('Erro: ' + (e?.message || 'desconhecido'));
                } finally { setSaqueLoading(false); }
              }} disabled={saqueLoading || !saqueValor || !saquePix}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-[#C9A84C] text-[#0A0A0A] rounded-xl hover:bg-[#D4B84C] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saqueLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saqueLoading ? 'Enviando...' : 'Solicitar Saque'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AgendaView({ onNavigate, shopId, maxAppointments }: { onNavigate: (v: View) => void, shopId: string, maxAppointments?: number }) {
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [barberMap, setBarberMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!shopId) return;
    const unsub = subscribeToAppointments(shopId, (data) => {
      setAppointments(data);
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from('barbers').select('id, name');
      const map: Record<string, string> = {};
      (data || []).forEach((b: any) => { map[b.id] = b.name; });
      setBarberMap(map);
    })();
  }, []);

  const fmtTime = (dt: string) => {
    const d = new Date(dt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const fmtDate = (dt: string) => dt.split('T')[0];

  const getWhatsAppLink = (appointment: any) => {
    const phone = appointment.user_phone || '';
    const message = encodeURIComponent(
      `Ol� ${appointment.user_name}! Seu agendamento na KERNEL BARBER SHOPPER est� confirmado:\n` +
      `Data: ${fmtDate(appointment.date)}\n` +
      `Hor�rio: ${fmtTime(appointment.date)}\n` +
      `Servi�o: ${appointment.service_name}\n` +
      `Profissional: ${barberMap[appointment.professional_id] || appointment.professional_id}\n` +
      `Aguardamos voc�!`
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  const handleConfirm = async (id: string, _appointment: any) => {
    try {
      await updateAppointment(id, { status: 'confirmed' });
      const link = getWhatsAppLink(_appointment);
      window.open(link, '_blank');
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  const filteredAppointments = appointments.filter(a => fmtDate(a.date) === selectedDate);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#C9A84C]">Agenda</h1>
        <button 
           onClick={() => onNavigate('ia')}
           className="bg-[#C9A84C] text-[#0A0A0A] px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo com IA
        </button>
      </div>

      {maxAppointments && maxAppointments < Infinity && (
        <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-xl px-4 py-3 text-xs text-[#C9A84C] font-medium flex items-center gap-2">
          <Crown className="w-4 h-4 shrink-0" />
          Plano Free: {appointments.length}/{maxAppointments} agendamentos usados
          {appointments.length >= maxAppointments && (
            <span className="ml-auto text-red-500 font-bold">Limite atingido</span>
          )}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white"
        />
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-6 p-4 border-b border-[#2A2A2A] text-[10px] uppercase font-bold tracking-widest text-[#C9A84C]">
          <div className="col-span-1">Hor�rio</div>
          <div className="col-span-1">Cliente</div>
          <div className="col-span-1">Servi�o</div>
          <div className="col-span-1">Barbeiro</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">A��o</div>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {loading ? (
            <div className="p-8 text-center text-[#888]">
              <Loader2 className="w-6 h-6 animate-spin inline" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-8 text-center text-[#888]">
              Nenhum agendamento para esta data
            </div>
          ) : (
            filteredAppointments.map((item) => (
              <div key={item.id} className="grid grid-cols-6 p-4 items-center text-sm group hover:bg-[#2A2A2A]/30 transition-all">
                <div className="col-span-1 font-bold text-[#C9A84C] flex items-center gap-2">
                  <StatusDot status={item.status} /> {fmtTime(item.date)}
                </div>
                <div className="col-span-1 text-[#eee]">{item.user_name}</div>
                <div className="col-span-1 text-[#888]">{item.service_name}</div>
                <div className="col-span-1">
                  <span className="bg-[#C9A84C]/10 text-[#C9A84C] text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider">
                    {barberMap[item.professional_id] || item.professional_id}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider",
                    item.status === 'confirmed' ? "bg-green-500/10 text-green-500" :
                    item.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-red-500/10 text-red-500"
                  )}>
                    {item.status === 'confirmed' ? 'Confirmado' : 
                     item.status === 'pending' ? 'Pendente' : 'Cancelado'}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  {item.status === 'pending' && (
                    <button 
                      onClick={() => handleConfirm(item.id, item)}
                      className="text-[#25D366] hover:text-[#25D366]/80 transition-all text-xs font-bold flex items-center gap-1 ml-auto"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.758-1.653-2.055-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.21-.242-.579-.487-.5-.67-.51-.173-.007-.37-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.148.198 2.095 3.2 5.077 4.49.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.412.248-.693.248-1.287.173-1.412-.074-.124-.272-.198-.57-.347z"/></svg>
                      WhatsApp
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BarbersView({ onNavigate, shopId, maxBarbers }: { onNavigate: (v: View) => void, shopId?: string, maxBarbers?: number }) {
  const [barbers, setBarbers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newBarber, setNewBarber] = React.useState({ name: '', slug: '', bio: '', instagram: '', whatsapp: '', image: '', styles: [] as string[] });
  const [adding, setAdding] = React.useState(false);
  const [selectedBarber, setSelectedBarber] = React.useState<any>(null);
  const [editBarber, setEditBarber] = React.useState({ name: '', slug: '', bio: '', instagram: '', whatsapp: '', image: '', styles: [] as string[] });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const fetchBarbers = async () => {
      try {
        let query = supabase.from('barbers').select('*').eq('active', true);
        if (shopId) query = query.eq('shop_id', shopId);
        const { data } = await query.order('name');
        setBarbers(data || []);
      } catch (e) {
        console.error('Error fetching barbers:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBarbers();
  }, [shopId]);

  React.useEffect(() => {
    if (!shopId) return;
    const unsub = subscribeToAppointments(shopId, (data) => {
      setAppointments(data);
    });
    return () => unsub();
  }, [shopId]);

  const getStats = (barberId: string) => {
    const barberApps = appointments.filter(a =>
      a.professional_id === barberId && a.status === 'confirmed'
    );
    const cuts = barberApps.length;
    const rev = barberApps.reduce((sum: number, a: any) => sum + (Number(a.service_price) || 0), 0);
    const rating = cuts > 0 ? Math.min(5, 4 + (cuts / 100)).toFixed(1) : '0.0';
    return { cuts, rev, rating: Number(rating) };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const slugify = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const copyStoreLink = (slug: string, name: string) => {
    const url = `${window.location.origin}/?loja=${slug}`;
    navigator.clipboard.writeText(url);
    toast.error(`Link da loja de ${name} copiado!`);
  };

  const handleAddBarber = async () => {
    if (!newBarber.name) return;
    setAdding(true);
    try {
      const slug = newBarber.slug || slugify(newBarber.name);
      await addBarber({
        id: slug,
        shop_id: shopId || null,
        name: newBarber.name,
        slug,
        bio: newBarber.bio || null,
        instagram: newBarber.instagram || null,
        whatsapp: newBarber.whatsapp || null,
        image_url: newBarber.image || null,
        haircut_styles: JSON.stringify(newBarber.styles),
        active: true,
      });
      setShowAddModal(false);
      setNewBarber({ name: '', slug: '', bio: '', instagram: '', whatsapp: '', image: '', styles: [] });
    } catch (error: any) {
      toast.error('Erro ao adicionar: ' + (error?.message || ''));
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (barber: any) => {
    let styles: string[] = [];
    try { styles = JSON.parse(barber.haircut_styles || '[]'); } catch {}
    setSelectedBarber(barber);
    setEditBarber({
      name: barber.name || '',
      slug: barber.slug || '',
      bio: barber.bio || '',
      instagram: barber.instagram || '',
      whatsapp: barber.whatsapp || '',
      image: barber.image_url || '',
      styles,
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedBarber || !editBarber.name) return;
    setSaving(true);
    try {
      await updateBarber(selectedBarber.id, {
        name: editBarber.name,
        slug: editBarber.slug,
        bio: editBarber.bio || null,
        instagram: editBarber.instagram || null,
        whatsapp: editBarber.whatsapp || null,
        image_url: editBarber.image || null,
        haircut_styles: JSON.stringify(editBarber.styles),
      });
      setSelectedBarber(null);
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + (error?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (barber: any) => {
    if (!confirm(`Tem certeza que deseja excluir ${barber.name}?`)) return;
    try {
      await deleteBarber(barber.id);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + (error?.message || ''));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-8"
    >
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#C9A84C]">Equipe de Barbeiros</h1>
        {maxBarbers && maxBarbers < Infinity && barbers.length >= maxBarbers ? (
          <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
            <Crown className="w-4 h-4" /> Fa�a upgrade para + Barbeiros
          </div>
        ) : (
        <button onClick={() => setShowAddModal(true)}
          className="bg-[#C9A84C] text-[#0A0A0A] px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-[#C9A84C]/20">
          <Plus className="w-4 h-4 inline mr-2" /> Adicionar Membro
        </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin inline" />
        </div>
      ) : barbers.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-[#333] mx-auto mb-4" />
          <p className="text-[#888] text-sm mb-4">Nenhum barbeiro cadastrado ainda.</p>
          {maxBarbers && maxBarbers < Infinity && barbers.length >= maxBarbers ? (
            <div className="text-[#C9A84C] text-xs font-bold">Limite do plano Free atingido. Fa�a upgrade para cadastrar Barbeiros.</div>
          ) : (
          <button onClick={() => setShowAddModal(true)}
            className="bg-[#C9A84C] text-[#0A0A0A] px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#E8C96A] transition-all">
            Adicionar Primeiro Membro
          </button>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers.map((b) => {
          const stats = getStats(b.id);
          return (
          <div key={b.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center group hover:border-[#C9A84C]/50 transition-all">
            {b.image_url ? (
              <img src={b.image_url} className="w-20 h-20 rounded-full mx-auto mb-6 object-cover border-4 border-[#141414] shadow-xl group-hover:scale-105 transition-all" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9A7A30] to-[#E8C96A] mx-auto mb-6 flex items-center justify-center text-2xl font-bold text-black border-4 border-[#141414] shadow-xl group-hover:scale-105 transition-all">
                {getInitials(b.name)}
              </div>
            )}
            <h3 className="text-lg font-bold text-white mb-1">{b.name}</h3>
            <p className="text-[#888] text-xs font-medium uppercase tracking-widest mb-2">{b.slug}</p>
            {b.bio && <p className="text-[#666] text-xs mb-4">{b.bio}</p>}

            {(b.instagram || b.whatsapp) && (
              <div className="flex justify-center gap-3 mb-4">
                {b.instagram && (
                  <a href={`https://instagram.com/${b.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#888] hover:text-pink-500 transition-colors">
                    <Instagram className="w-3 h-3" /> {b.instagram}
                  </a>
                )}
                {b.whatsapp && (
                  <a href={`https://wa.me/${b.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#888] hover:text-green-500 transition-colors">
                    <Phone className="w-3 h-3" /> WhatsApp
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 border-y border-[#2A2A2A] py-4 mb-6">
              <div>
                <p className="text-sm font-bold text-[#C9A84C]">{stats.cuts}</p>
                <p className="text-[9px] text-[#888] uppercase font-bold tracking-wider">Cortes</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#C9A84C]">${stats.rev.toFixed(0)}</p>
                <p className="text-[9px] text-[#888] uppercase font-bold tracking-wider">Faturado</p>
              </div>
              <div>
                <p className="text-sm font-bold text-[#C9A84C]">{stats.rating}</p>
                <p className="text-[9px] text-[#888] uppercase font-bold tracking-wider">Nota</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => onNavigate('agenda')}
                className="flex-1 py-2.5 border border-[#C9A84C] text-[#C9A84C] rounded-xl text-xs font-bold hover:bg-[#C9A84C] hover:text-black transition-all">Ver Agenda</button>
              <button onClick={() => openEdit(b)}
                className="flex-1 py-2.5 border border-[#2A2A2A] text-[#888] rounded-xl text-xs font-bold hover:bg-[#2A2A2A] transition-all flex items-center justify-center gap-1">
                <Edit className="w-3 h-3" /> Editar
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => copyStoreLink(b.slug, b.name)}
                className="flex-1 py-2.5 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 rounded-xl text-xs font-bold hover:bg-[#C9A84C]/20 transition-all flex items-center justify-center gap-1">
                <Store className="w-3 h-3" /> Link
              </button>
              <button onClick={() => handleDelete(b)}
                className="px-3 py-2.5 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          );
        })}
      </div>
      )}

      {/* Add Barber Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-[#C9A84C] mb-6">Adicionar Barbeiro</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Nome</label>
                <input type="text" placeholder="Nome completo" value={newBarber.name}
                  onChange={e => {
                    setNewBarber({ ...newBarber, name: e.target.value, slug: slugify(e.target.value) });
                  }}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Slug (link da loja)</label>
                <input type="text" placeholder="meu-barbeiro" value={newBarber.slug}
                  onChange={e => setNewBarber({...newBarber, slug: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
                <p className="text-[10px] text-[#555] mt-1">URL: /?loja={newBarber.slug || '...'}</p>
              </div>
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Bio</label>
                <input type="text" placeholder="profissional especialista em..." value={newBarber.bio}
                  onChange={e => setNewBarber({...newBarber, bio: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Instagram</label>
                  <input type="text" placeholder="@username" value={newBarber.instagram}
                    onChange={e => setNewBarber({...newBarber, instagram: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
                </div>
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">WhatsApp</label>
                  <input type="text" placeholder="11999999999" value={newBarber.whatsapp}
                    onChange={e => setNewBarber({...newBarber, whatsapp: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]" />
                </div>
              </div>
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Foto de Perfil</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setNewBarber({...newBarber, image: reader.result as string});
                  reader.readAsDataURL(file);
                }} className="w-full text-sm text-[#888] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#C9A84C] file:text-black file:font-bold file:text-xs hover:file:bg-[#d4b85a]" />
                {(newBarber as any).image && <img src={(newBarber as any).image} className="w-20 h-20 object-cover rounded-full mt-2 border border-[#2A2A2A]" />}
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#888] font-bold text-sm hover:bg-[#2A2A2A] transition-all">Cancelar</button>
              <button onClick={handleAddBarber} disabled={adding || !newBarber.name}
                className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C96A] transition-all disabled:opacity-50">
                {adding ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Adicionar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Barber Modal */}
      {selectedBarber && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#C9A84C]">Editar {selectedBarber.name}</h2>
              <button onClick={() => setSelectedBarber(null)} className="text-[#888] hover:text-white">?</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Nome</label>
                <input type="text" value={editBarber.name}
                  onChange={e => setEditBarber({...editBarber, name: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Slug (link da loja)</label>
                <input type="text" value={editBarber.slug}
                  onChange={e => setEditBarber({...editBarber, slug: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Bio</label>
                <input type="text" value={editBarber.bio}
                  onChange={e => setEditBarber({...editBarber, bio: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Instagram</label>
                  <input type="text" value={editBarber.instagram}
                    onChange={e => setEditBarber({...editBarber, instagram: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
                </div>
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">WhatsApp</label>
                  <input type="text" value={editBarber.whatsapp}
                    onChange={e => setEditBarber({...editBarber, whatsapp: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
                </div>
              </div>
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Foto de Perfil</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setEditBarber({...editBarber, image: reader.result as string});
                  reader.readAsDataURL(file);
                }} className="w-full text-sm text-[#888] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#C9A84C] file:text-black file:font-bold file:text-xs hover:file:bg-[#d4b85a]" />
                {editBarber.image && <img src={editBarber.image} className="w-20 h-20 object-cover rounded-full mt-2 border border-[#2A2A2A]" />}
              </div>
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Fotos de Cortes (exemplos)</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setEditBarber({...editBarber, styles: [...editBarber.styles, reader.result as string]});
                  reader.readAsDataURL(file);
                }} className="w-full text-sm text-[#888] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#C9A84C] file:text-black file:font-bold file:text-xs hover:file:bg-[#d4b85a]" />
                {editBarber.styles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editBarber.styles.map((s, i) => (
                      <div key={i} className="relative group">
                        <img src={s} className="w-16 h-16 object-cover rounded-lg border border-[#2A2A2A]" />
                        <button onClick={() => setEditBarber({...editBarber, styles: editBarber.styles.filter((_, j) => j !== i)})}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">?</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setSelectedBarber(null)}
                className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#888] font-bold text-sm hover:bg-[#2A2A2A] transition-all">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C96A] transition-all disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function StockView({ onNavigate, shopId, maxProducts }: { onNavigate: (v: View) => void, shopId: string, maxProducts: number }) {
  const [stock, setStock] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'low'>('all');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ name: '', cat: '', qty: '', price: '', image: '' });
  const [addError, setAddError] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [editItem, setEditItem] = React.useState({ name: '', category: '', quantity: '', price: '', image: '' });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!shopId) return;
    const unsub = subscribeToCollection('inventory', (data) => {
      setStock(data);
      setLoading(false);
    }, shopId);
    return () => unsub();
  }, [shopId]);

  const filteredStock = stock.filter(item => {
    if (filter === 'low') return item.quantity <= 5;
    if (search) return item.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.qty) return;
    setAddError('');
    if (stock.length >= maxProducts) {
      setAddError(`Limite de ${maxProducts} produtos atingido. Fa�a upgrade do plano para cadastrar mais.`);
      setAdding(false);
      return;
    }
    setAdding(true);
    try {
      await addItem(shopId, 'inventory', {
        name: newItem.name,
        category: newItem.cat || 'Geral',
        quantity: parseInt(newItem.qty),
        price: parseFloat(newItem.price) || 0,
        image_url: newItem.image || null,
      });
      setNewItem({ name: '', cat: '', qty: '', price: '', image: '' });
      setShowAddModal(false);
    } catch (error: any) {
      const msg = error?.message || 'Erro ao adicionar produto. Verifique o console para detalhes.';
      setAddError(msg);
      console.error('Error adding item:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await deleteInventoryItem(id);
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const openDetail = (item: any) => {
    setSelectedItem(item);
    setEditItem({
      name: item.name || '',
      category: item.category || '',
      quantity: String(item.quantity || 0),
      price: String(item.price || 0),
      image: item.image_url || '',
    });
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await updateItem(shopId, 'inventory', selectedItem.id, {
        name: editItem.name,
        category: editItem.category,
        quantity: parseInt(editItem.quantity) || 0,
        price: parseFloat(editItem.price) || 0,
        image_url: editItem.image || null,
      });
      setSelectedItem(null);
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Erro ao salvar: ' + (error?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#C9A84C]">Controle de Estoque</h1>
          {maxProducts < Infinity && (
            <p className="text-[10px] text-[#888] mt-1">{stock.length}/{maxProducts} produtos cadastrados</p>
          )}
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          disabled={stock.length >= maxProducts}
          className="bg-[#C9A84C] text-[#0A0A0A] px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-[#C9A84C]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 inline mr-2" /> Novo Item
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" />
          <input 
            type="text" 
            placeholder="Pesquisar produto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-all text-white"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none appearance-none cursor-pointer text-white"
        >
          <option value="all">Todos os itens</option>
          <option value="low">Estoque baixo</option>
        </select>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 p-4 border-b border-[#2A2A2A] text-[10px] uppercase font-bold tracking-widest text-[#C9A84C]">
          <div className="col-span-2">Produto</div>
          <div>Categoria</div>
          <div className="text-center">Quantidade</div>
          <div className="text-right">Pre�o</div>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {loading ? (
            <div className="p-8 text-center text-[#888]">
              <Loader2 className="w-6 h-6 animate-spin inline" />
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="p-8 text-center text-[#888] text-sm">
              Nenhum item encontrado
            </div>
          ) : (
            filteredStock.map((item) => (
             <div key={item.id} onClick={() => openDetail(item)} className="grid grid-cols-5 p-4 items-center text-sm hover:bg-[#2A2A2A]/20 transition-all cursor-pointer">
                <div className="text-[#eee] flex items-center gap-3 col-span-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    item.quantity <= 2 ? 'bg-red-500' : item.quantity <= 5 ? 'bg-orange-500' : 'bg-green-500'
                  )} />
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="text-[#888]">{item.category}</div>
                <div className="flex justify-center">
                  <span className={cn(
                    "px-3 py-1 rounded-lg font-bold text-[11px]",
                    item.quantity <= 2 ? 'bg-red-500/10 text-red-500' : item.quantity <= 5 ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'
                  )}>
                    {item.quantity} un
                  </span>
                </div>
                <div className="text-right text-[#C9A84C] font-bold">
                  ${Number(item.price || 0).toFixed(2)}
                </div>
             </div>
            ))
          )}
        </div>
      </div>
      
      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-xl font-bold text-[#C9A84C] mb-6">Adicionar Novo Produto</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Nome do Produto</label>
                <input
                  type="text"
                  placeholder="Ex: Pomada Modeladora"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
              
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Categoria</label>
                <select
                  value={newItem.cat}
                  onChange={(e) => setNewItem({...newItem, cat: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C] appearance-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Finalizador">Finalizador</option>
                  <option value="Barba">Barba</option>
                  <option value="Cabelo">Cabelo</option>
                  <option value="Descart�vel">Descart�vel</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Quantidade</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newItem.qty}
                    onChange={(e) => setNewItem({...newItem, qty: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Preço ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Foto do Produto</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setNewItem({...newItem, image: reader.result as string});
                  reader.readAsDataURL(file);
                }} className="w-full text-sm text-[#888] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#C9A84C] file:text-black file:font-bold file:text-xs hover:file:bg-[#d4b85a]" />
                {newItem.image && <img src={newItem.image} className="w-20 h-20 object-cover rounded-xl mt-2 border border-[#2A2A2A]" />}
              </div>
            </div>

            {addError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {addError}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#888] font-bold text-sm hover:bg-[#2A2A2A] transition-all"
                disabled={adding}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddItem}
                disabled={adding}
                className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C96A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Salvando...' : 'Adicionar Produto'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Product Detail / Edit Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-8 max-w-lg w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#C9A84C]">Detalhes do Produto</h2>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-[#888] hover:text-white transition-all"
              >
                ?
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Nome do Produto</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem({...editItem, name: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
                />
              </div>

              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Categoria</label>
                <select
                  value={editItem.category}
                  onChange={(e) => setEditItem({...editItem, category: e.target.value})}
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C] appearance-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Finalizador">Finalizador</option>
                  <option value="Barba">Barba</option>
                  <option value="Cabelo">Cabelo</option>
                  <option value="Descart�vel">Descart�vel</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Quantidade</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editItem.quantity}
                    onChange={(e) => setEditItem({...editItem, quantity: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
                <div>
                  <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Preço ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editItem.price}
                    onChange={(e) => setEditItem({...editItem, price: e.target.value})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#888] text-xs font-bold uppercase tracking-wider mb-2 block">Foto do Produto</label>
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setEditItem({...editItem, image: reader.result as string});
                  reader.readAsDataURL(file);
                }} className="w-full text-sm text-[#888] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#C9A84C] file:text-black file:font-bold file:text-xs hover:file:bg-[#d4b85a]" />
                {editItem.image && <img src={editItem.image} className="w-20 h-20 object-cover rounded-xl mt-2 border border-[#2A2A2A]" />}
              </div>

              {selectedItem.created_at && (
                <p className="text-[10px] text-[#555] uppercase tracking-wider">
                  Criado em: {new Date(selectedItem.created_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { handleDelete(selectedItem.id); setSelectedItem(null); }}
                className="px-4 py-3 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Excluir
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#888] font-bold text-sm hover:bg-[#2A2A2A] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C96A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      <div className="text-center py-4">
        <button 
           onClick={() => onNavigate('ia')}
           className="bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#C9A84C]/20 transition-all flex items-center justify-center gap-2 mx-auto"
        >
          <Bot className="w-4 h-4" />
          Analisar Estoque com IA
        </button>
      </div>
    </motion.div>
  );
}

function FinanceiroView({ shopId }: { shopId: string }) {
  const [revenue, setRevenue] = React.useState(0);
  const [expenses, setExpenses] = React.useState(0);
  const [profit, setProfit] = React.useState(0);
  const [ticketMedio, setTicketMedio] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [revenueByService, setRevenueByService] = React.useState<{service: string, value: number}[]>([]);

  React.useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    const fetchFinancialData = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
        
        const allApps = await new Promise<any[]>((resolve) => {
          subscribeToAppointments(shopId, resolve);
        });
        
        const fmtDate = (dt: string) => dt.split('T')[0];
        const recentApps = allApps.filter((a: any) => fmtDate(a.date) >= dateStr && a.status === 'confirmed');
        
        const totalRevenue = recentApps.reduce((sum: number, app: any) => sum + (Number(app.service_price) || 0), 0);
        setRevenue(totalRevenue);
        
        const totalExpenses = totalRevenue * 0.3;
        setExpenses(totalExpenses);
        
        setProfit(totalRevenue - totalExpenses);
        
        setTicketMedio(recentApps.length > 0 ? totalRevenue / recentApps.length : 0);
        
        const serviceMap: {[key: string]: number} = {};
        recentApps.forEach((app: any) => {
          const service = app.service_name || 'Outros';
          serviceMap[service] = (serviceMap[service] || 0) + (Number(app.service_price) || 0);
        });
        
        const serviceData = Object.entries(serviceMap).map(([service, value]) => ({
          service,
          value: value as number
        })).sort((a, b) => b.value - a.value);
        
        setRevenueByService(serviceData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching financial data:', error);
        setLoading(false);
      }
    };
    
    fetchFinancialData();
  }, [shopId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <h1 className="text-2xl font-bold text-[#C9A84C]">Financeiro</h1>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin inline" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
              <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Receita (30d)</p>
              <div className="text-2xl font-bold text-[#E8C96A]">{formatCurrency(revenue)}</div>
              <p className="text-[10px] mt-1 font-medium text-green-500">Dados reais</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
              <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Despesas (30d)</p>
              <div className="text-2xl font-bold text-[#E8C96A]">{formatCurrency(expenses)}</div>
              <p className="text-[10px] mt-1 font-medium text-red-500">Estimado (30%)</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
              <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Lucro L�quido</p>
              <div className="text-2xl font-bold text-[#E8C96A]">{formatCurrency(profit)}</div>
              <p className="text-[10px] mt-1 font-medium text-green-500">{revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}% margem</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-2xl">
              <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Ticket M�dio</p>
              <div className="text-2xl font-bold text-[#E8C96A]">{formatCurrency(ticketMedio)}</div>
              <p className="text-[10px] mt-1 font-medium text-[#888]">Por agendamento</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest mb-4">Receita por Servi�o</h3>
              <div className="space-y-4">
                {revenueByService.length === 0 ? (
                  <p className="text-[#888] text-sm text-center py-4">Nenhum dado ainda</p>
                ) : (
                  revenueByService.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#eee]">{item.service}</span>
                        <span className="text-[#C9A84C]">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${revenue > 0 ? (item.value / revenue) * 100 : 0}%` }}
                          className="h-full bg-[#C9A84C]" 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#888] uppercase tracking-widest mb-4">Resumo Financeiro</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Total de Agendamentos (30d)</span>
                  <span className="text-[#eee] font-bold">
                    {revenueByService.reduce((acc: number) => acc + 1, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Receita Bruta</span>
                  <span className="text-[#C9A84C] font-bold">{formatCurrency(revenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Despesas Estimadas</span>
                  <span className="text-red-400 font-bold">{formatCurrency(expenses)}</span>
                </div>
                <div className="border-t border-[#2A2A2A] pt-3 flex justify-between text-sm">
                  <span className="text-[#eee] font-bold">Lucro L�quido</span>
                  <span className="text-[#C9A84C] font-bold">{formatCurrency(profit)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function IAAssistantView({ messages, input, setInput, sendMessage, isTyping, chatEndRef }: any) {
  const quickPrompts = [
    'Quais hor�rios livres hoje?',
    'Relat�rio de estoque cr�tico',
    'Ranking de barbeiros do m�s',
    'Previs�o de receita semanal',
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full max-w-4xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#C9A84C]">IA Assistente</h1>
        <p className="text-[#888] text-sm">Consultor em agendamentos, estoque e estrat�gia de neg�cio.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {quickPrompts.map((p, i) => (
          <button 
            key={i} 
            onClick={() => sendMessage(p)}
            className="text-[11px] font-bold px-4 py-2 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-all uppercase tracking-tight"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 mb-6 flex flex-col gap-6 custom-scroll">
        {messages.map((m: any, i: number) => (
          <div key={i} className={cn(
            "flex gap-4 max-w-[85%]",
            m.role === 'user' ? "ml-auto flex-row-reverse" : ""
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
              m.role === 'ia' ? "bg-[#C9A84C] text-[#0A0A0A]" : "bg-[#2A2A2A] text-[#C9A84C]"
            )}>
              {m.role === 'ia' ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="space-y-1">
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                m.role === 'ia' ? "bg-[#1A1A1A] text-[#eee] border border-[#2A2A2A]" : "bg-[#C9A84C]/10 text-[#fff] border border-[#C9A84C]/20"
              )}>
                {m.text}
              </div>
              <p className={cn("text-[9px] text-[#888] font-medium uppercase tracking-wider", m.role === 'user' ? "text-right" : "")}>{m.time}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4 items-center animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[#0A0A0A] animate-spin" />
            </div>
            <p className="text-xs text-[#888] font-bold tracking-widest uppercase">IA est� processando...</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="relative group">
        <textarea 
          placeholder="Pergunte sobre agendamentos, receita ou estoque..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 pr-16 text-sm focus:outline-none focus:border-[#C9A84C] transition-all min-h-[60px] max-h-[150px] resize-none"
          rows={2}
        />
        <button 
          onClick={() => sendMessage()}
          disabled={!input.trim()}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#C9A84C] text-[#0A0A0A] rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-[#C9A84C]/10"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}


// Subcomponents
function Card({ title, children, action, onAction }: { title: string, children: React.ReactNode, action?: string, onAction?: () => void }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <h3 className="text-[11px] uppercase font-bold tracking-widest text-[#C9A84C]">{title}</h3>
        {action && (
          <button onClick={onAction} className="text-xs font-bold text-[#888] flex items-center gap-1 hover:text-[#C9A84C] transition-all">
            {action} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function AgendaRow({ status, time, client, service, barber }: any) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-[#2A2A2A]/50 last:border-0 group">
       <StatusDot status={status} />
       <div className="text-sm font-bold text-white w-14 group-hover:text-[#C9A84C] transition-all">{time}</div>
       <div className="flex-1">
         <p className="text-sm text-[#eee] font-medium">{client}</p>
         <p className="text-[10px] text-[#888]">{service}</p>
       </div>
       <span className="text-[9px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 py-1 px-3 rounded-full uppercase tracking-wider">{barber}</span>
    </div>
  );
}

function StockAlert({ status, item, qty }: any) {
  return (
    <div className="flex items-center gap-4 py-2 group">
      {status === 'critical' && <AlertCircle className="w-4 h-4 text-red-500" />}
      {status === 'low' && <Clock className="w-4 h-4 text-orange-500" />}
      {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
      <span className="text-sm text-[#eee] flex-1 group-hover:text-white transition-all">{item}</span>
      <span className={cn(
        "text-[10px] font-bold px-2 py-1 rounded-md",
        status === 'critical' ? 'bg-red-500/10 text-red-500' : 
        status === 'low' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'
      )}>{qty}</span>
    </div>
  );
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  handleReset() {
    this.setState({ hasError: false, error: null });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <AlertCircle className="w-16 h-16 text-[#C9A84C] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h2>
            <p className="text-[#888] mb-4 text-sm">{this.state.error?.message || 'Erro inesperado'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-[#C9A84C] text-black rounded-xl font-bold hover:bg-[#d4b85a] transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl font-bold hover:bg-[#222] transition-colors"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function StatusDot({ status }: { status: 'ok' | 'wait' | 'cancel' }) {
  const colors = {
    ok: 'bg-green-500 shadow-green-500/20',
    wait: 'bg-[#C9A84C] shadow-[#C9A84C]/20',
    cancel: 'bg-red-500 shadow-red-500/20',
  };
  return <div className={cn("w-2 h-2 rounded-full shadow-lg shrink-0", colors[status])} />;
}

function FinBar({ label, val, percentage }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-[#888]">{label}</span>
        <span className="text-[#C9A84C]">{val}</span>
      </div>
      <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full bg-[#C9A84C]" 
        />
      </div>
    </div>
  );
}