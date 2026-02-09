/**
 * Initialize editor data layer (DB + server translations + local edits).
 * UI setup and element detection happen in runtime.js after this resolves.
 */

import { initDB } from './db.js';
import { initDataStore } from './dataStore.js';
import { injectOverlayStyles } from './styles.js';

export async function initialize() {
  injectOverlayStyles();
  await initDB();
  await initDataStore();
}
