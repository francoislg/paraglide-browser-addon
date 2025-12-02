import * as m from '../paraglide/messages.js';

function About() {
  return (
    <div className="page">
      <h2 dangerouslySetInnerHTML={{ __html: m.about_title() }} />
      <p dangerouslySetInnerHTML={{ __html: m.about_content() }} />
    </div>
  );
}

export default About;
