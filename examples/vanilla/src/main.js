// Import Paraglide messages and runtime
import * as m from './paraglide/messages.js';
import { setLocale, getLocale } from './paraglide/runtime.js';

function updateUI() {
  // Use innerHTML to preserve HTML comments from debug plugin
  document.getElementById('welcome').innerHTML = m.welcome();
  document.getElementById('greeting').innerHTML = m.greeting({ name: 'Developer' });
  document.getElementById('description').innerHTML = m.description();
  document.getElementById('current-language').innerHTML = m.current_language();
  document.getElementById('pluralization-demo').innerHTML = m.pluralization_demo();

  // Update plural demo with different counts
  updatePluralDemo();
}

function updatePluralDemo() {
  const counts = [0, 1, 2, 5, 42];
  const listHtml = counts
    .map(count => `<li>${m.items_count({ count })}</li>`)
    .join('');

  document.getElementById('plural-list').innerHTML = listHtml;
}

window.switchLanguage = (lang) => {
  setLocale(lang, { reload: false });
  updateUI();
};

// Initialize
updateUI();

console.log('[Paraglide] App initialized with language:', getLocale());
