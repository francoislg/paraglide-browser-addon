<script>
  import * as m from '$lib/paraglide/messages.js';

  const counts = [0, 1, 2, 5, 42];
</script>

<style>
  .page {
    line-height: 1.6;
  }

  h2 {
    font-size: 2em;
    margin-top: 0;
  }

  .plural-demo {
    background: rgba(255, 255, 255, 0.15);
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
  }

  .plural-demo h3 {
    margin-top: 0;
    font-size: 1.5em;
  }

  .plural-list {
    list-style: none;
    padding: 0;
    margin: 15px 0;
  }

  .plural-list li {
    padding: 10px;
    margin: 8px 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 1.1em;
  }
</style>

<div class="page">
  <h2>{@html m.products_title()}</h2>

  <div class="plural-demo">
    <h3>{@html m.pluralization_demo()}</h3>
    <ul class="plural-list">
      {#each counts as count}
        <li>{@html m.items_count({ count })}</li>
      {/each}
    </ul>
  </div>
</div>
