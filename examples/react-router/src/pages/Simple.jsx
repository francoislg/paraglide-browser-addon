import * as m from '../paraglide/messages.js';

function Simple() {
  return (
    <div className="page">
      <h2>{m.simple_title()}</h2>
      <p>{m.simple_content()}</p>
      <p>{m.simple_example_1()}</p>
      <p>{m.simple_example_2()}</p>
      <p>{m.simple_example_3()}</p>
    </div>
  );
}

export default Simple;
