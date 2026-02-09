import * as m from '../paraglide/messages.js';

function Inputs() {
  return (
    <div className="page">
      <h2>{m.inputs_title()}</h2>

      <div className="attr-demo">
        <input type="text" className="search-input" placeholder={m.search_placeholder()} />
        <img src="https://placehold.co/48x48/667eea/white?text=P" alt={m.logo_alt()} className="demo-logo" />
        <button className="close-btn" aria-label={m.close_aria_label()}>&#x2715;</button>
      </div>

      <p className="attr-note">Multi-attribute element (text + title):</p>
      <button className="submit-btn" title={m.submit_title()}>{m.submit_label()}</button>
    </div>
  );
}

export default Inputs;
