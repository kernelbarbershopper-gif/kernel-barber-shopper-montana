import React, { createContext, useContext, useState, ReactNode } from 'react';

type TranslationMap = Record<string, { en: string; 'pt-BR': string; es: string }>;

const translations: TranslationMap = {
  // Core UI strings
  'Lojas Ativas': { en: 'Active Shops', 'pt-BR': 'Lojas Ativas', es: 'Tiendas Activas' },
  'Receita Mensal (MRR)': { en: 'Monthly Recurring Revenue (MRR)', 'pt-BR': 'Receita Mensal (MRR)', es: 'Ingresos Mensuales (MRR)' },
  'Usuários Totais': { en: 'Total Users', 'pt-BR': 'Usuários Totais', es: 'Usuarios Totales' },
  'Novas Lojas (30d)': { en: 'New Shops (30d)', 'pt-BR': 'Novas Lojas (30d)', es: 'Nuevas Tiendas (30d)' },
  'Visão Geral': { en: 'Overview', 'pt-BR': 'Visão Geral', es: 'Visión General' },
  'Lojas': { en: 'Shops', 'pt-BR': 'Lojas', es: 'Tiendas' },
  'Financeiro': { en: 'Finance', 'pt-BR': 'Financeiro', es: 'Finanzas' },
  'Saques': { en: 'Withdrawals', 'pt-BR': 'Saques', es: 'Retiros' },
  'Usuários': { en: 'Users', 'pt-BR': 'Usuários', es: 'Usuarios' },
  'Planos': { en: 'Plans', 'pt-BR': 'Planos', es: 'Planes' },
  'Configurações': { en: 'Settings', 'pt-BR': 'Configurações', es: 'Configuración' },
  'Dashboard SaaS': { en: 'SaaS Dashboard', 'pt-BR': 'Dashboard SaaS', es: 'Panel SaaS' },
  'Gerencie lojas, usuários, planos e monitore a saúde do sistema.': { en: 'Manage shops, users, plans and monitor system health.', 'pt-BR': 'Gerencie lojas, usuários, planos e monitore a saúde do sistema.', es: 'Administre tiendas, usuarios, planes y monitoree la salud del sistema.' },
  'Planos Ativos': { en: 'Active Plans', 'pt-BR': 'Planos Ativos', es: 'Planes Activos' },
  'Lojas Recentes': { en: 'Recent Shops', 'pt-BR': 'Lojas Recentes', es: 'Tiendas Recientes' },
  'Nova Loja': { en: 'New Shop', 'pt-BR': 'Nova Loja', es: 'Nueva Tienda' },
  'Nome da Loja': { en: 'Shop Name', 'pt-BR': 'Nome da Loja', es: 'Nombre de la Tienda' },
  'Email do Dono': { en: 'Owner Email', 'pt-BR': 'Email do Dono', es: 'Correo del Propietario' },
  'Plano': { en: 'Plan', 'pt-BR': 'Plano', es: 'Plan' },
  'Duração (dias)': { en: 'Duration (days)', 'pt-BR': 'Duração (dias)', es: 'Duración (días)' },
  'Cancelar': { en: 'Cancel', 'pt-BR': 'Cancelar', es: 'Cancelar' },
  'Criar Loja': { en: 'Create Shop', 'pt-BR': 'Criar Loja', es: 'Crear Tienda' },
  'Alterar Plano': { en: 'Change Plan', 'pt-BR': 'Alterar Plano', es: 'Cambiar Plan' },
  'Novo plano': { en: 'New Plan', 'pt-BR': 'Novo plano', es: 'Nuevo plan' },
  'Renovar por (dias)': { en: 'Renew for (days)', 'pt-BR': 'Renovar por (dias)', es: 'Renovar por (días)' },
  'Excluir': { en: 'Delete', 'pt-BR': 'Excluir', es: 'Eliminar' },
  'Fechar': { en: 'Close', 'pt-BR': 'Fechar', es: 'Cerrar' },
  'Salvar': { en: 'Save', 'pt-BR': 'Salvar', es: 'Guardar' },
  'Notificações': { en: 'Notifications', 'pt-BR': 'Notificações', es: 'Notificaciones' },
  'Nenhuma notificação': { en: 'No notifications', 'pt-BR': 'Nenhuma notificação', es: 'Sin notificaciones' },
  'Marcar tudo lido': { en: 'Mark all as read', 'pt-BR': 'Marcar tudo lido', es: 'Marcar todo como leído' },
  'Nenhuma loja cadastrada': { en: 'No shop registered yet.', 'pt-BR': 'Nenhuma loja cadastrada', es: 'Ninguna tienda registrada aún.' },
  'Nenhum usuário cadastrado ainda.': { en: 'No user registered yet.', 'pt-BR': 'Nenhum usuário cadastrado ainda.', es: 'Ningún usuario registrado todavía.' },
  'Sistema Online': { en: 'System Online', 'pt-BR': 'Sistema Online', es: 'Sistema En Línea' },
  'Admin': { en: 'Admin', 'pt-BR': 'Admin', es: 'Admin' },
  'Buscar lojas...': { en: 'Search shops...', 'pt-BR': 'Buscar lojas...', es: 'Buscar tiendas...' },
  'Buscar usuários...': { en: 'Search users...', 'pt-BR': 'Buscar usuários...', es: 'Buscar usuarios...' },
  'Criando...': { en: 'Creating...', 'pt-BR': 'Criando...', es: 'Creando...' },
  // Add more keys as needed
};

type LocaleContextType = {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState('en');
  const t = (key: string) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang as keyof typeof entry] || key;
  };
  return (
    <LocaleContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
