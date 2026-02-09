import * as m from '../paraglide/messages.js';

function Stacking() {
  return (
    <div className="page">
      <h2>{m.stacking_title()}</h2>
      <p>{m.stacking_description()}</p>

      <div style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '24px', margin: '20px 0' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: '12px' }}></div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3em' }}>{m.stacking_card_title()}</h3>
        <p style={{ margin: '8px 0', fontSize: '1em' }}>{m.stacking_card_text()}</p>
        <button style={{ background: 'white', color: '#667eea', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginRight: '8px' }}>{m.stacking_card_button()}</button>
        <a href="/stacking" style={{ color: 'white', fontWeight: 600 }}>{m.stacking_card_link()}</a>
      </div>
    </div>
  );
}

export default Stacking;
