import * as m from '../paraglide/messages.js';

function Parameters() {
  return (
    <div className="page">
      <h2>{m.parameters_title()}</h2>
      <p>{m.parameters_content()}</p>
      <p>{m.greeting({ name: 'Alice' })}</p>
      <p>{m.greeting({ name: 'Bob' })}</p>
      <p>{m.greeting({ name: 'Charlie' })}</p>
      <p>{m.description()}</p>
    </div>
  );
}

export default Parameters;
