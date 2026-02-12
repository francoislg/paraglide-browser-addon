import path from 'path';
import fs from 'fs';

/**
 * Read all translation files for configured locales.
 *
 * Reads `project.inlang/settings.json` to discover locales and the message
 * file path pattern, then loads each locale's JSON into a single object.
 *
 * @param {string} rootPath - Project root directory path
 * @returns {{ [locale: string]: object }} Translations keyed by locale
 */
export function readTranslations(rootPath, verbose = () => {}) {
  const projectPath = path.join(rootPath, 'project.inlang');
  const settingsPath = path.join(projectPath, 'settings.json');

  if (!fs.existsSync(settingsPath)) {
    throw new Error('settings.json not found');
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  const locales = settings.locales || [];
  const pathPattern = settings['plugin.inlang.messageFormat']?.pathPattern || './messages/{locale}.json';

  const languages = {};
  for (const locale of locales) {
    const messagePath = path.join(
      rootPath,
      pathPattern.replace('{locale}', locale).replace('./', '')
    );

    verbose('Looking for:', messagePath);

    if (fs.existsSync(messagePath)) {
      const messages = JSON.parse(fs.readFileSync(messagePath, 'utf-8'));
      languages[locale] = messages;
      verbose('✓ Loaded:', locale);
    } else {
      verbose('✗ Not found:', messagePath);
    }
  }

  return languages;
}

/**
 * Creates middleware for serving Paraglide editor endpoints
 *
 * This middleware handles the following endpoints:
 * - `/@paraglide-editor/langs.json` - Serves raw translation JSON files for all configured locales
 *
 * @param {Object} viteConfig - Resolved Vite configuration object
 * @param {string} viteConfig.root - Project root directory path
 * @returns {Function} Express-style middleware function (req, res, next)
 */
export function createEditorMiddleware(viteConfig, verbose = () => {}) {
  return (req, res, next) => {
    if (req.url === '/@paraglide-editor/langs.json') {
      const rootPath = viteConfig.root || process.cwd();

      try {
        const languages = readTranslations(rootPath, verbose);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(languages, null, 2));

        verbose('✓ Served raw translations for:', Object.keys(languages).join(', '));
      } catch (err) {
        console.error('[paraglide-editor] Error serving translations:', err);
        const statusCode = err.message === 'settings.json not found' ? 404 : 500;
        res.statusCode = statusCode;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    next();
  };
}
