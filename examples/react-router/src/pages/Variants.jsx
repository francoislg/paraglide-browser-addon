import * as m from '../paraglide/messages.js';

function Variants() {
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

  return (
    <div className="page">
      <h2>{m.variants_title()}</h2>

      <div className="plural-demo">
        <h3>{m.pluralization_demo()}</h3>
        <ul className="plural-list">
          {counts.map((count) => (
            <li key={count}>
              {m.items_count({ count })}
            </li>
          ))}
        </ul>
      </div>

      <div className="plural-demo">
        <h3>{m.ordinal_demo()}</h3>
        <ul className="plural-list">
          {positions.map((position) => (
            <li key={position}>
              {m.finish_position({ position })}
            </li>
          ))}
        </ul>
      </div>

      <div className="plural-demo">
        <h3>{m.matching_demo()}</h3>
        <ul className="plural-list">
          {platforms.map((platform) => (
            <li key={platform}>
              {m.platform_message({ platform })}
            </li>
          ))}
        </ul>
      </div>

      <div className="plural-demo">
        <h3>{m.multi_selector_demo()}</h3>
        <ul className="plural-list">
          {activities.map((activity, idx) => (
            <li key={idx}>
              {m.user_activity(activity)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Variants;
