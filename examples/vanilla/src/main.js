// Import Paraglide messages and runtime
import * as m from './paraglide/messages.js';
import { setLocale, getLocale } from './paraglide/runtime.js';

function updateUI() {
  // Use innerHTML to preserve HTML comments from debug plugin
  document.getElementById('welcome').innerHTML = m.welcome();
  document.getElementById('greeting').innerHTML = m.greeting({ name: 'Developer' });
  document.getElementById('description').innerHTML = m.description();
  document.getElementById('current-language').innerHTML = m.current_language();

  // Update all variant demos
  document.getElementById('pluralization-demo').innerHTML = m.pluralization_demo();
  updatePluralDemo();

  document.getElementById('ordinal-demo').innerHTML = m.ordinal_demo();
  updateOrdinalDemo();

  document.getElementById('matching-demo').innerHTML = m.matching_demo();
  updateMatchingDemo();

  document.getElementById('multi-selector-demo').innerHTML = m.multi_selector_demo();
  updateMultiSelectorDemo();

  // Stacking section
  document.getElementById('stacking-title').innerHTML = m.stacking_title();
  document.getElementById('stacking-description').innerHTML = m.stacking_description();
  document.getElementById('stacking-card-title').innerHTML = m.stacking_card_title();
  document.getElementById('stacking-card-text').innerHTML = m.stacking_card_text();
  document.getElementById('stacking-card-button').innerHTML = m.stacking_card_button();
  document.getElementById('stacking-card-link').innerHTML = m.stacking_card_link();
}

function updatePluralDemo() {
  const counts = [0, 1, 2, 5, 42];
  const listHtml = counts
    .map(count => `<li>${m.items_count({ count })}</li>`)
    .join('');

  document.getElementById('plural-list').innerHTML = listHtml;
}

function updateOrdinalDemo() {
  const positions = [1, 2, 3, 4, 11, 21, 22, 23];
  const listHtml = positions
    .map(position => `<li>${m.finish_position({ position })}</li>`)
    .join('');

  document.getElementById('ordinal-list').innerHTML = listHtml;
}

function updateMatchingDemo() {
  const platforms = ['android', 'ios', 'web', 'desktop'];
  const listHtml = platforms
    .map(platform => `<li>${m.platform_message({ platform })}</li>`)
    .join('');

  document.getElementById('matching-list').innerHTML = listHtml;
}

function updateMultiSelectorDemo() {
  const activities = [
    { count: 1, gender: 'male' },
    { count: 1, gender: 'female' },
    { count: 1, gender: 'other' },
    { count: 5, gender: 'male' },
    { count: 5, gender: 'female' },
    { count: 5, gender: 'other' }
  ];
  const listHtml = activities
    .map(activity => `<li>${m.user_activity(activity)}</li>`)
    .join('');

  document.getElementById('multi-selector-list').innerHTML = listHtml;
}

window.switchLanguage = (lang) => {
  setLocale(lang, { reload: false });
  updateUI();
};

// Initialize
updateUI();

console.log('[Paraglide] App initialized with language:', getLocale());
