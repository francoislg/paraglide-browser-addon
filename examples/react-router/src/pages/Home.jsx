import * as m from '../paraglide/messages.js';

function Home() {
  return (
    <div className="page">
      <h2>{m.home_title()}</h2>
      <p>{m.greeting({ name: 'Developer' })}</p>
      <p>{m.home_content()}</p>
      <p>{m.description()}</p>
    </div>
  );
}

export default Home;
