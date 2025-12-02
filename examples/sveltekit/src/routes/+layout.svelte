<script>
  import * as m from "$lib/paraglide/messages.js";
  import { setLocale, getLocale } from "$lib/paraglide/runtime.js";
  import { onMount } from "svelte";

  let { children } = $props();

  let currentLocale = $state(getLocale());

  onMount(() => {
    console.log("[Paraglide] App initialized with language:", getLocale());
  });

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
        <a href="/">{m.nav_home()}</a>
        <a href="/about">{m.nav_about()}</a>
        <a href="/products">{m.nav_products()}</a>
      </nav>

      <div class="language-switcher">
        <h3>{m.language_switcher()}</h3>
        <div>
          <button onclick={() => switchLanguage("en")}>English</button>
          <button onclick={() => switchLanguage("es")}>Español</button>
          <button onclick={() => switchLanguage("fr")}>Français</button>
        </div>
        <div class="current">{m.current_language()}</div>
      </div>
    </header>

    <main class="main">
      {@render children()}
    </main>
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

  .language-switcher {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 2px solid rgba(255, 255, 255, 0.2);
  }

  .language-switcher h3 {
    margin: 0 0 15px 0;
    font-size: 1.2em;
  }

  button {
    background: white;
    color: #667eea;
    border: none;
    padding: 12px 24px;
    margin: 5px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: transform 0.2s;
  }

  button:hover {
    transform: translateY(-2px);
  }

  .current {
    margin-top: 15px;
    font-size: 1.1em;
  }

  .main {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
</style>
