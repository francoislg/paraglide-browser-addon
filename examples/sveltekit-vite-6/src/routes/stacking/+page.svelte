<script>
  import * as m from "$lib/paraglide/messages.js";
</script>

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

  <h3>{m.stacking_nested_title()}</h3>
  <p class="hint">{m.stacking_nested_hint()}</p>
  <div class="nested-wrapper">
    <div class="nested-outer">
      <span>{m.stacking_outer()}</span>
      <a href="/stacking">{m.stacking_outer_link()}</a>
    </div>
    <button class="nested-inner" aria-label={m.stacking_inner_aria()}>
      <span>{m.stacking_inner()}</span>
    </button>
  </div>
</div>

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

  .nested-wrapper {
    position: relative;
    margin: 12px 0;
  }

  .nested-outer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 32px 24px;
    margin: 0;
  }

  .nested-outer a {
    color: white;
    font-weight: 600;
    white-space: nowrap;
    margin-left: 16px;
  }

  .nested-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: absolute;
    inset: 0;
    width: 100%;
    background: rgba(100, 150, 255, 0.25);
    border: none;
    border-radius: 12px;
    padding: 16px;
    padding-left: 64px;
    margin: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  .hint {
    font-size: 0.9em;
    opacity: 0.8;
  }
</style>
