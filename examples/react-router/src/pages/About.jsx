import * as m from '../paraglide/messages.js';

function About() {
  return (
    <div className="page">
      <h2>{m.about_title()}</h2>
      <p>{m.about_content()}</p>
    </div>
  );
}

export default About;
