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
      <h3>{m.language_switcher()}</h3>
      <div>
        <button onClick={() => switchLanguage('en')}>English</button>
        <button onClick={() => switchLanguage('es')}>Español</button>
        <button onClick={() => switchLanguage('fr')}>Français</button>
      </div>
      <div className="current">{m.current_language()}</div>
    </div>
  );
}

export default LanguageSwitcher;
