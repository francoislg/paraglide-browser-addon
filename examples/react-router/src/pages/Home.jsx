import * as m from '../paraglide/messages.js';

function Home() {
  return (
    <div className="page">
      <h2 dangerouslySetInnerHTML={{ __html: m.home_title() }} />
      <p dangerouslySetInnerHTML={{ __html: m.greeting({ name: 'Developer' }) }} />
      <p dangerouslySetInnerHTML={{ __html: m.home_content() }} />
      <p dangerouslySetInnerHTML={{ __html: m.description() }} />
    </div>
  );
}

export default Home;
