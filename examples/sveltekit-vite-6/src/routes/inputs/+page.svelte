<script>
  import * as m from '$lib/paraglide/messages.js';
</script>

<style>
  .page {
    line-height: 1.6;
  }

  h2 {
    font-size: 2em;
    margin-top: 0;
  }

  .attr-demo {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 16px;
  }

  .search-input {
    flex: 1;
    padding: 12px 16px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 16px;
    box-sizing: border-box;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .demo-logo {
    width: 48px;
    height: 48px;
    border-radius: 8px;
  }

  .close-btn {
    padding: 8px 16px;
    font-size: 20px;
    line-height: 1;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  .attr-note {
    margin-top: 16px;
    font-size: 0.9em;
    opacity: 0.8;
  }

  .submit-btn {
    background: white;
    color: #667eea;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: transform 0.2s;
  }

  .submit-btn:hover {
    transform: translateY(-2px);
  }
</style>

<div class="page">
  <h2>{m.inputs_title()}</h2>

  <div class="attr-demo">
    <input type="text" placeholder={m.search_placeholder()} class="search-input" />
    <img src="https://placehold.co/48x48/667eea/white?text=P" alt={m.logo_alt()} class="demo-logo" />
    <button class="close-btn" aria-label={m.close_aria_label()}>&#x2715;</button>
  </div>

  <p class="attr-note">Multi-attribute element (text + title):</p>
  <button class="submit-btn" title={m.submit_title()}>{m.submit_label()}</button>
</div>
