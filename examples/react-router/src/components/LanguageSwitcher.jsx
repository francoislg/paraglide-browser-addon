import { useState, useEffect } from 'react';
import { setLocale, getLocale } from '../paraglide/runtime.js';
import * as m from '../paraglide/messages.js';

function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState(getLocale());

  const switchLanguage = (lang) => {
    setLocale(lang, { reload: false });
    setCurrentLocale(lang);
  };

  return (
    <div className="language-switcher">
      <button onClick={() => switchLanguage('en')}>en</button>
      <span className="separator">/</span>
      <button onClick={() => switchLanguage('es')}>es</button>
      <span className="separator">/</span>
      <button onClick={() => switchLanguage('fr')}>fr</button>
    </div>
  );
}

export default LanguageSwitcher;
