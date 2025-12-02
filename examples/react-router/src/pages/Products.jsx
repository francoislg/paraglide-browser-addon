import * as m from '../paraglide/messages.js';

function Products() {
  const counts = [0, 1, 2, 5, 42];

  return (
    <div className="page">
      <h2>{m.products_title()}</h2>

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
    </div>
  );
}

export default Products;
