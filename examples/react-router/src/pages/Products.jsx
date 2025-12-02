import * as m from '../paraglide/messages.js';

function Products() {
  const counts = [0, 1, 2, 5, 42];

  return (
    <div className="page">
      <h2 dangerouslySetInnerHTML={{ __html: m.products_title() }} />

      <div className="plural-demo">
        <h3 dangerouslySetInnerHTML={{ __html: m.pluralization_demo() }} />
        <ul className="plural-list">
          {counts.map((count) => (
            <li
              key={count}
              dangerouslySetInnerHTML={{ __html: m.items_count({ count }) }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Products;
