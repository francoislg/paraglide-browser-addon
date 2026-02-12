<script>
  import * as m from "$lib/paraglide/messages.js";
  import { setLocale, getLocale } from "$lib/paraglide/runtime.js";

  let { children } = $props();

  let currentLocale = $state(getLocale());

  function switchLanguage(lang) {
    setLocale(lang, { reload: false });
    currentLocale = getLocale(); // Update reactive state
  }
</script>

<div class="app">
  {#key currentLocale}
    <header class="header">
      <h1>{m.welcome()}</h1>
      <nav class="nav">
        <a href="/">{m.nav_simple()}</a>
        <a href="/parameters">{m.nav_parameters()}</a>
        <a href="/variants">{m.nav_variants()}</a>
        <a href="/inputs">{m.nav_inputs()}</a>
        <a href="/stacking">{m.nav_stacking()}</a>
      </nav>
    </header>

    <main class="main">
      {@render children()}
    </main>

    <a href="/parameters" class="floating-cta">{m.floating_help()}</a>

    <div class="language-switcher">
      <button onclick={() => switchLanguage("en")}>en</button>
      <span class="separator">/</span>
      <button onclick={() => switchLanguage("es")}>es</button>
      <span class="separator">/</span>
      <button onclick={() => switchLanguage("fr")}>fr</button>
    </div>
  {/key}
</div>

<style>
  :global(body) {
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: white;
  }

  .app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 30px 40px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    margin-bottom: 30px;
  }

  h1 {
    margin: 0 0 20px 0;
    font-size: 2.5em;
  }

  .nav {
    display: flex;
    gap: 20px;
    margin: 20px 0;
  }

  .nav a {
    color: white;
    text-decoration: none;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    transition: all 0.2s;
    font-weight: 600;
  }

  .nav a:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .floating-cta {
    position: fixed;
    bottom: 50px;
    right: 50px;
    background: #16a34a;
    color: white;
    text-decoration: none;
    padding: 14px 24px;
    border-radius: 50px;
    font-weight: 700;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    z-index: 1000;
  }

  .language-switcher {
    position: fixed;
    bottom: 15px;
    left: 15px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 6px 10px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    z-index: 1000;
    font-size: 13px;
  }

  button {
    background: white;
    color: #667eea;
    border: none;
    padding: 4px 8px;
    margin: 0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: transform 0.2s;
    min-width: auto;
  }

  button:hover {
    transform: translateY(-2px);
  }

  .separator {
    color: white;
    margin: 0 2px;
    opacity: 0.5;
  }

  .main {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
</style>
