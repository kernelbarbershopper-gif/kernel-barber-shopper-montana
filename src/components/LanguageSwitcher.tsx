import React from 'react';
import { useLocale } from '../contexts/LocaleContext';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLocale();

  const changeLanguage = (code: string) => {
    setLang(code);
  };

  const flagUrl = (code: string) => {
    switch (code) {
      case 'en':
        return 'https://flagcdn.com/us.svg';
      case 'pt-BR':
        return 'https://flagcdn.com/br.svg';
      case 'es':
        return 'https://flagcdn.com/es.svg';
      default:
        return '';
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <button onClick={() => changeLanguage('en')} aria-label="English" className={lang === 'en' ? 'opacity-100' : 'opacity-60'}>
        <img src={flagUrl('en')} alt="English" className="w-5 h-5" />
      </button>
      <button onClick={() => changeLanguage('pt-BR')} aria-label="Português (Brasil)" className={lang === 'pt-BR' ? 'opacity-100' : 'opacity-60'}>
        <img src={flagUrl('pt-BR')} alt="Português (Brasil)" className="w-5 h-5" />
      </button>
      <button onClick={() => changeLanguage('es')} aria-label="Español" className={lang === 'es' ? 'opacity-100' : 'opacity-60'}>
        <img src={flagUrl('es')} alt="Español" className="w-5 h-5" />
      </button>
    </div>
  );
}
