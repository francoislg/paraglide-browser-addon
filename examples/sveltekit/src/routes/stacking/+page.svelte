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

  p {
    font-size: 1.2em;
  }

  .card {
    position: relative;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 24px;
    margin: 20px 0;
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    border-radius: 12px;
  }

  .card h3 {
    margin: 0 0 8px 0;
    font-size: 1.3em;
  }

  .card p {
    margin: 8px 0;
    font-size: 1em;
  }

  .card button {
    background: white;
    color: #667eea;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    margin-right: 8px;
  }

  .card a {
    color: white;
    font-weight: 600;
  }
</style>

<div class="page">
  <h2>{m.stacking_title()}</h2>
  <p>{m.stacking_description()}</p>

  <div class="card">
    <div class="card-overlay"></div>
    <h3>{m.stacking_card_title()}</h3>
    <p>{m.stacking_card_text()}</p>
    <button>{m.stacking_card_button()}</button>
    <a href="/stacking">{m.stacking_card_link()}</a>
  </div>
</div>
