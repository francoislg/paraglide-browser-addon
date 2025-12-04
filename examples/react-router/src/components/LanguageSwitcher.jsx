import { setLocale } from '../paraglide/runtime.js';

function LanguageSwitcher() {
  const switchLanguage = (lang) => {
    setLocale(lang, { reload: false });
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
