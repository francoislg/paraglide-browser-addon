import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates middleware for serving Paraglide debug endpoints
 *
 * This middleware handles the following endpoints:
 * - `/@paraglide-debug/langs.json` - Serves raw translation JSON files for all configured locales
 *
 * The middleware reads the project.inlang/settings.json to discover:
 * - Available locales
 * - Path pattern for message files
 *
 * Then loads and serves all translation files as a single JSON object:
 * ```json
 * {
 *   "en": { "welcome": "Welcome!", ... },
 *   "es": { "welcome": "¡Bienvenido!", ... },
 *   "fr": { "welcome": "Bienvenue!", ... }
 * }
 * ```
 *
 * @param {Object} viteConfig - Resolved Vite configuration object
 * @param {string} viteConfig.root - Project root directory path
 * @returns {Function} Express-style middleware function (req, res, next)
 *
 * @example
 * ```js
 * // In Vite plugin configureServer hook
 * configureServer(server) {
 *   server.middlewares.use(createDebugMiddleware(viteConfig));
 * }
 * ```
 */
export function createDebugMiddleware(viteConfig) {
  return (req, res, next) => {
    // Serve raw JSON translations for debugging
    if (req.url === '/@paraglide-debug/langs.json') {
      const rootPath = viteConfig.root || process.cwd();
      const projectPath = path.join(rootPath, 'project.inlang');

      try {
        // Read settings to get the pathPattern
        const settingsPath = path.join(projectPath, 'settings.json');
        if (!fs.existsSync(settingsPath)) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'settings.json not found' }));
          return;
        }

        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        const locales = settings.locales || [];
        const pathPattern = settings['plugin.inlang.messageFormat']?.pathPattern || './messages/{locale}.json';

        // Collect all language JSON files
        // pathPattern is relative to the project root, not project.inlang
        const languages = {};
        for (const locale of locales) {
          const messagePath = path.join(
            rootPath,
            pathPattern.replace('{locale}', locale).replace('./', '')
          );

          console.log('[paraglide-debug] Looking for:', messagePath);

          if (fs.existsSync(messagePath)) {
            const messages = JSON.parse(fs.readFileSync(messagePath, 'utf-8'));
            languages[locale] = messages;
            console.log('[paraglide-debug] ✓ Loaded:', locale);
          } else {
            console.log('[paraglide-debug] ✗ Not found:', messagePath);
          }
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(languages, null, 2));

        console.log('[paraglide-debug] ✓ Served raw translations for:', Object.keys(languages).join(', '));
      } catch (err) {
        console.error('[paraglide-debug] Error serving translations:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    next();
  };
}
