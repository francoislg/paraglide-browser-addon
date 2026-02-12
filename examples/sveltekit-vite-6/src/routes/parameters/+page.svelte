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
  <h2>{m.parameters_title()}</h2>
  <p>{m.parameters_content()}</p>
  <p>{m.greeting({ name: 'Alice' })}</p>
  <p>{m.greeting({ name: 'Bob' })}</p>
  <p>{m.greeting({ name: 'Charlie' })}</p>
  <p>{m.description()}</p>
</div>
