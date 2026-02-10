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

      <h3 style={{ marginTop: '32px', fontSize: '1.3em' }}>{m.stacking_nested_title()}</h3>
      <p style={{ fontSize: '0.9em', opacity: 0.8 }}>{m.stacking_nested_hint()}</p>
      <div style={{ position: 'relative', margin: '12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '32px 24px', margin: 0 }}>
          <span>{m.stacking_outer()}</span>
          <a href="/stacking" style={{ color: 'white', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '16px' }}>{m.stacking_outer_link()}</a>
        </div>
        <button aria-label={m.stacking_inner_aria()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', inset: 0, width: '100%', background: 'rgba(100, 150, 255, 0.25)', border: 'none', borderRadius: '12px', padding: '16px', margin: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', textAlign: 'left' }}>
          <span>{m.stacking_inner()}</span>
        </button>
      </div>
    </div>
  );
}

export default Stacking;
