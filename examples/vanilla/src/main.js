// Import Paraglide messages and runtime
import * as m from './paraglide/messages.js';
import { setLocale, getLocale } from './paraglide/runtime.js';
import { initDB, syncTranslations, getStats } from './db.js';

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

async function updateDBStats() {
  const stats = await getStats();
  const statusEl = document.getElementById('db-status');
  statusEl.innerHTML = `
    <strong>Database:</strong> ${stats.totalKeys} keys across ${stats.locales.length} locales
    (${Object.entries(stats.keysByLocale).map(([locale, count]) => `${locale}: ${count}`).join(', ')})
  `;
}

window.switchLanguage = (lang) => {
  setLocale(lang, { reload: false });
  updateUI();
};

window.syncDB = async () => {
  const btn = document.getElementById('sync-btn');
  btn.disabled = true;
  btn.textContent = 'Syncing...';

  try {
    const result = await syncTranslations();
    console.log('[DB] Sync result:', result);

    // Update stats display
    await updateDBStats();

    btn.textContent = `✓ Synced (${result.newKeys} new, ${result.updatedKeys} updated)`;
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Sync Translations';
    }, 3000);
  } catch (error) {
    console.error('[DB] Sync error:', error);
    btn.textContent = '✗ Sync Failed';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Sync Translations';
    }, 3000);
  }
};

// Initialize
async function init() {
  // Initialize database
  await initDB();
  console.log('[DB] Database initialized');

  // Update UI
  updateUI();

  // Show initial stats
  await updateDBStats();

  console.log('[Paraglide] App initialized with language:', getLocale());
}

init();
