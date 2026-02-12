<script>
  import * as m from '$lib/paraglide/messages.js';

  const counts = [0, 1, 2, 5, 42];
  const positions = [1, 2, 3, 4, 11, 21, 22, 23];
  const platforms = ['android', 'ios', 'web', 'desktop'];
  const activities = [
    { count: 1, gender: 'male' },
    { count: 1, gender: 'female' },
    { count: 1, gender: 'other' },
    { count: 5, gender: 'male' },
    { count: 5, gender: 'female' },
    { count: 5, gender: 'other' }
  ];
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
  <h2>{m.variants_title()}</h2>

  <div class="plural-demo">
    <h3>{m.pluralization_demo()}</h3>
    <ul class="plural-list">
      {#each counts as count}
        <li>{m.items_count({ count })}</li>
      {/each}
    </ul>
  </div>

  <div class="plural-demo">
    <h3>{m.ordinal_demo()}</h3>
    <ul class="plural-list">
      {#each positions as position}
        <li>{m.finish_position({ position })}</li>
      {/each}
    </ul>
  </div>

  <div class="plural-demo">
    <h3>{m.matching_demo()}</h3>
    <ul class="plural-list">
      {#each platforms as platform}
        <li>{m.platform_message({ platform })}</li>
      {/each}
    </ul>
  </div>

  <div class="plural-demo">
    <h3>{m.multi_selector_demo()}</h3>
    <ul class="plural-list">
      {#each activities as activity}
        <li>{m.user_activity(activity)}</li>
      {/each}
    </ul>
  </div>
</div>
