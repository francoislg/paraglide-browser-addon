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
</style>

<div class="page">
  <h2>{@html m.home_title()}</h2>
  <p>{@html m.greeting({ name: 'Developer' })}</p>
  <p>{@html m.home_content()}</p>
  <p>{@html m.description()}</p>
</div>
