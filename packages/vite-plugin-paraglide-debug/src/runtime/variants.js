/**
 * Variant System for Paraglide Translations
 *
 * This module handles all variant-related functionality including:
 * - Parsing variant declarations (input params, local transformations)
 * - Evaluating selectors (plural, ordinal, direct matching)
 * - Finding best matching templates
 * - Rendering variant strings with parameter substitution
 * - Detecting which variant is currently active
 *
 * Supports all Paraglide variant types:
 * 1. Cardinal plural: Uses Intl.PluralRules to get "one", "other", "few", "many"
 * 2. Ordinal plural: Uses Intl.PluralRules with type=ordinal for "1st", "2nd", "3rd", etc.
 * 3. Direct matching: Simple equality checks (e.g., platform=android, platform=ios)
 * 4. Multi-selector: Combines multiple conditions (e.g., plural + gender)
 */

/**
 * Parse declaration strings into structured objects
 *
 * Declarations describe input parameters and local transformations:
 * - "input count" → input parameter named "count"
 * - "local countPlural = count: plural" → local variable that applies plural transformation
 * - "local ordinal = position: plural type=ordinal" → ordinal transformation with options
 *
 * @param {string[]} declarations - Array of declaration strings
 * @returns {Array<{type: string, name: string, source?: string, transform?: string, options?: object}>}
 *
 * @example
 * parseDeclarations(['input count', 'local countPlural = count: plural'])
 * → [
 *     {type: 'input', name: 'count'},
 *     {type: 'local', name: 'countPlural', source: 'count', transform: 'plural', options: {}}
 *   ]
 *
 * parseDeclarations(['input position', 'local ordinal = position: plural type=ordinal'])
 * → [
 *     {type: 'input', name: 'position'},
 *     {type: 'local', name: 'ordinal', source: 'position', transform: 'plural', options: {type: 'ordinal'}}
 *   ]
 */
function parseDeclarations(declarations = []) {
  return declarations.filter(decl => decl && typeof decl === 'string').map(decl => {
    if (decl.startsWith('input ')) {
      return {
        type: 'input',
        name: decl.substring(6).trim()
      };
    }

    if (decl.startsWith('local ')) {
      const rest = decl.substring(6).trim();
      const equalsPos = rest.indexOf('=');
      if (equalsPos === -1) {
        console.warn('[paraglide-debug] Invalid local declaration (missing =):', decl);
        return { type: 'unknown', name: decl };
      }

      const name = rest.substring(0, equalsPos).trim();
      const afterEquals = rest.substring(equalsPos + 1).trim();
      const colonPos = afterEquals.indexOf(':');
      if (colonPos === -1) {
        console.warn('[paraglide-debug] Invalid local declaration (missing :):', decl);
        return { type: 'unknown', name: decl };
      }

      const source = afterEquals.substring(0, colonPos).trim();
      const afterColon = afterEquals.substring(colonPos + 1).trim();
      const [transform, ...optionsParts] = afterColon.split(' ').map(s => s.trim());

      const options = {};
      for (const part of optionsParts) {
        if (!part || !part.includes('=')) continue;
        const [key, value] = part.split('=').map(s => s.trim());
        if (key && value) {
          options[key] = value;
        }
      }

      return {
        type: 'local',
        name,
        source,
        transform,
        options
      };
    }

    console.warn('[paraglide-debug] Unknown declaration format:', decl);
    return { type: 'unknown', name: decl };
  });
}

/**
 * Evaluate a selector (apply transformations like plural, ordinal)
 *
 * This replicates Paraglide's transformation logic using the same APIs:
 * - plural → Intl.PluralRules(locale).select(number) → "one", "other", "few", "many", "zero"
 * - plural type=ordinal → Intl.PluralRules(locale, {type: 'ordinal'}).select(number) → "one", "two", "few", "other"
 *
 * @param {object} declaration - Parsed declaration with transform info
 * @param {object} params - Input parameters
 * @param {string} locale - Locale for transformation (e.g., 'en', 'fr', 'es')
 * @returns {string} - Evaluated value
 *
 * @example
 * evaluateSelector(
 *   {type: 'local', name: 'countPlural', source: 'count', transform: 'plural', options: {}},
 *   {count: 5},
 *   'en'
 * ) → "other"
 *
 * evaluateSelector(
 *   {type: 'local', name: 'ordinal', source: 'position', transform: 'plural', options: {type: 'ordinal'}},
 *   {position: 1},
 *   'en'
 * ) → "one"
 */
function evaluateSelector(declaration, params, locale) {
  const sourceValue = params[declaration.source];

  if (declaration.transform === 'plural') {
    const options = declaration.options || {};
    const pluralRules = new Intl.PluralRules(locale, options);
    return pluralRules.select(Number(sourceValue));
  }

  return String(sourceValue);
}

/**
 * Parse a match key into conditions object
 *
 * Match keys describe the conditions that must be met to use a template:
 * - "countPlural=one" → {countPlural: "one"}
 * - "countPlural=one, gender=male" → {countPlural: "one", gender: "male"}
 * - "platform=*" → {platform: "*"} (wildcard matches anything)
 *
 * @param {string} matchKey - Match key like "countPlural=one, gender=male"
 * @returns {object} - Conditions object like {countPlural: "one", gender: "male"}
 */
function parseMatchKey(matchKey) {
  const conditions = {};
  const parts = matchKey.split(',').map(s => s.trim());

  for (const part of parts) {
    const [selector, value] = part.split('=').map(s => s.trim());
    if (selector && value) {
      conditions[selector] = value;
    }
  }

  return conditions;
}

/**
 * Infer selector names from match keys
 *
 * Used when a variant has no `selectors` field (direct matching variants).
 * Extracts unique selector names by parsing all match keys.
 *
 * @param {object} match - Match object with keys like "platform=android", "platform=ios"
 * @returns {string[]} - Array of unique selector names (e.g., ["platform"])
 *
 * @example
 * inferSelectorsFromMatchKeys({
 *   "platform=android": "Android",
 *   "platform=ios": "iOS",
 *   "platform=*": "Unknown"
 * }) → ["platform"]
 *
 * inferSelectorsFromMatchKeys({
 *   "countPlural=one, gender=male": "He has 1",
 *   "countPlural=other, gender=*": "They have many"
 * }) → ["countPlural", "gender"]
 */
function inferSelectorsFromMatchKeys(match) {
  const selectorSet = new Set();

  for (const matchKey of Object.keys(match)) {
    const conditions = parseMatchKey(matchKey);
    for (const selectorName of Object.keys(conditions)) {
      selectorSet.add(selectorName);
    }
  }

  return Array.from(selectorSet);
}

/**
 * Evaluate all selectors and return their current values
 *
 * This is the shared logic used by both renderVariant() and detectActiveVariant().
 * Handles all selector evaluation including the case where selectors field is missing.
 *
 * Process:
 * 1. Parse declarations to understand transformations
 * 2. Get selectors list (or infer from match keys if missing)
 * 3. Loop through selectors and evaluate each one
 * 4. Return selectorValues object
 *
 * @param {object} variant - Variant structure with optional declarations, selectors, and match
 * @param {object} params - Input parameters (e.g., {count: 5, platform: "ios"})
 * @param {string} locale - Locale for plural transformations
 * @returns {object} - Evaluated selector values (e.g., {countPlural: "other", platform: "ios"})
 *
 * @example
 * // With selectors field
 * evaluateAllSelectors(
 *   {
 *     declarations: ['input count', 'local countPlural = count: plural'],
 *     selectors: ['countPlural'],
 *     match: {'countPlural=one': '...', 'countPlural=other': '...'}
 *   },
 *   {count: 5},
 *   'en'
 * ) → {countPlural: "other"}
 *
 * // Without selectors field (inferred from match keys)
 * evaluateAllSelectors(
 *   {
 *     match: {'platform=android': '...', 'platform=ios': '...'}
 *   },
 *   {platform: 'ios'},
 *   'en'
 * ) → {platform: "ios"}
 */
function evaluateAllSelectors(variant, params = {}, locale = 'en') {
  const declarations = parseDeclarations(variant.declarations || []);

  let selectors = variant.selectors || [];
  if (selectors.length === 0 && variant.match) {
    selectors = inferSelectorsFromMatchKeys(variant.match);
  }

  const selectorValues = {};
  for (const selectorName of selectors) {
    const declaration = declarations.find(d => d.name === selectorName);
    if (declaration) {
      if (declaration.type === 'local') {
        selectorValues[selectorName] = evaluateSelector(declaration, params, locale);
      } else if (declaration.type === 'input') {
        selectorValues[selectorName] = params[declaration.name];
      } else {
        selectorValues[selectorName] = params[selectorName];
      }
    } else {
      selectorValues[selectorName] = params[selectorName];
    }
  }

  return selectorValues;
}

/**
 * Find the best match from match object
 *
 * Unified matching logic used by both renderVariant() and detectActiveVariant().
 * Replicates Paraglide's matching logic:
 * - Process conditions in order (Paraglide generates more specific matches first)
 * - Wildcards (*) always match
 * - All non-wildcard conditions must match exactly
 *
 * @param {object} match - Match object mapping conditions to templates
 * @param {object} selectorValues - Evaluated selector values (e.g., {countPlural: "one", gender: "male"})
 * @returns {{matchKey: string|null, template: string|null}} - Both matchKey and template (or nulls if no match)
 *
 * @example
 * findBestMatch(
 *   {
 *     "countPlural=one, gender=male": "He has 1",
 *     "countPlural=one, gender=female": "She has 1",
 *     "countPlural=one, gender=*": "They have 1",
 *     "countPlural=other, gender=*": "They have {count}"
 *   },
 *   {countPlural: "one", gender: "female"}
 * ) → {matchKey: "countPlural=one, gender=female", template: "She has 1"}
 */
function findBestMatch(match, selectorValues) {
  for (const [matchKey, template] of Object.entries(match)) {
    const conditions = parseMatchKey(matchKey);

    let matches = true;
    for (const [selectorName, expectedValue] of Object.entries(conditions)) {
      const actualValue = selectorValues[selectorName];

      if (expectedValue === '*') {
        continue;
      }

      if (String(actualValue) !== String(expectedValue)) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return { matchKey, template };
    }
  }

  return { matchKey: null, template: null };
}

/**
 * Simple parameter substitution in template strings
 *
 * Replaces {param} placeholders with actual values from params object.
 *
 * @param {string} template - Template with {param} placeholders
 * @param {object} params - Parameters to substitute
 * @returns {string} - Rendered string
 *
 * @example
 * renderSimpleTemplate("You have {count} items", {count: 5}) → "You have 5 items"
 * renderSimpleTemplate("Hello {name}!", {name: "John"}) → "Hello John!"
 */
function renderSimpleTemplate(template, params = {}) {
  if (typeof template !== 'string') {
    return String(template || '');
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * Parse variant structure from various storage formats
 * Extracts the variant object from array or JSON string format
 *
 * @param {any} value - The value to parse (array, JSON string, or null)
 * @returns {object|null} - Variant structure object {declarations, selectors, match} or null
 *
 * @example
 * parseVariantStructure([{match: {...}}]) → {match: {...}}
 * parseVariantStructure('[{match: {...}}]') → {match: {...}}
 * parseVariantStructure('simple string') → null
 */
export function parseVariantStructure(value) {
  if (!value) return null;

  if (Array.isArray(value) && value[0]?.match) {
    return value[0];
  }

  if (typeof value === 'string' && value.trim().startsWith('[{')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed[0]?.match) {
        return parsed[0];
      }
    } catch (err) {
      return null;
    }
  }

  return null;
}

/**
 * Render a variant with proper selector evaluation
 *
 * This is the main entry point for rendering variant translations.
 * Replicates the logic used in Paraglide's compiled message functions.
 *
 * Process:
 * 1. Parse declarations to understand transformations
 * 2. Evaluate selectors with current parameters
 * 3. Find best matching template based on evaluated values
 * 4. Substitute parameters in selected template
 *
 * Supports all variant types:
 * - Direct matching: {match: {"platform=android": "...", "platform=*": "..."}}
 * - Plural (cardinal): {declarations: [...], selectors: ["countPlural"], match: {...}}
 * - Plural (ordinal): {declarations: [..., "type=ordinal"], selectors: ["ordinal"], match: {...}}
 * - Multi-selector: {declarations: [...], selectors: ["countPlural", "gender"], match: {...}}
 *
 * @param {object} variant - Variant structure with optional declarations, selectors, and match
 * @param {object} params - Parameters (e.g., {count: 5, gender: "male", platform: "ios"})
 * @param {string} locale - Locale for plural evaluation (e.g., 'en', 'fr', 'es')
 * @returns {string} - Rendered string
 *
 * @example
 * // Basic plural
 * renderVariant(
 *   {
 *     declarations: ['input count', 'local countPlural = count: plural'],
 *     selectors: ['countPlural'],
 *     match: {'countPlural=one': '1 item', 'countPlural=other': '{count} items'}
 *   },
 *   {count: 5},
 *   'en'
 * ) → '5 items'
 *
 * // Direct matching
 * renderVariant(
 *   {
 *     match: {'platform=android': 'Android', 'platform=ios': 'iOS', 'platform=*': 'Unknown'}
 *   },
 *   {platform: 'ios'},
 *   'en'
 * ) → 'iOS'
 *
 * // Multi-selector
 * renderVariant(
 *   {
 *     declarations: ['input count', 'input gender', 'local countPlural = count: plural'],
 *     selectors: ['countPlural', 'gender'],
 *     match: {
 *       'countPlural=one, gender=male': 'He has 1',
 *       'countPlural=other, gender=*': 'They have {count}'
 *     }
 *   },
 *   {count: 2, gender: 'female'},
 *   'en'
 * ) → 'They have 2'
 */
export function renderVariant(variant, params = {}, locale = 'en') {
  if (!variant || !variant.match || typeof variant.match !== 'object') {
    console.warn('[paraglide-debug] Invalid variant: missing match object');
    return '';
  }

  const selectorValues = evaluateAllSelectors(variant, params, locale);

  const result = findBestMatch(variant.match, selectorValues);

  if (!result.template) {
    console.warn('[paraglide-debug] No matching template found in variant');
    const firstTemplate = Object.values(variant.match)[0];
    return firstTemplate ? renderSimpleTemplate(firstTemplate, params) : '';
  }

  return renderSimpleTemplate(result.template, params);
}

/**
 * Detect which variant is currently active based on parameters
 *
 * This is used in the edit popup to automatically select the correct variant
 * in the dropdown when a user clicks on variant text.
 *
 * Process:
 * 1. Parse declarations to understand selectors
 * 2. Evaluate selectors with current parameters
 * 3. Find which match key corresponds to these values
 * 4. Return the match key (e.g., "countPlural=other, gender=male")
 *
 * @param {object} variantStructure - The variant structure with declarations, selectors, match
 * @param {object} params - Current parameter values (e.g., {count: 5, gender: "male"})
 * @param {string} locale - Current locale
 * @returns {string|null} - The match key for the active variant (e.g., "countPlural=other, gender=male")
 *
 * @example
 * detectActiveVariant(
 *   {
 *     declarations: ['input count', 'local countPlural = count: plural'],
 *     selectors: ['countPlural'],
 *     match: {'countPlural=one': '1 item', 'countPlural=other': '{count} items'}
 *   },
 *   {count: 5},
 *   'en'
 * ) → 'countPlural=other'
 *
 * detectActiveVariant(
 *   {
 *     declarations: ['input count', 'input gender', 'local countPlural = count: plural'],
 *     selectors: ['countPlural', 'gender'],
 *     match: {
 *       'countPlural=one, gender=male': 'He has 1',
 *       'countPlural=one, gender=female': 'She has 1',
 *       'countPlural=other, gender=*': 'They have {count}'
 *     }
 *   },
 *   {count: 1, gender: 'female'},
 *   'en'
 * ) → 'countPlural=one, gender=female'
 */
export function detectActiveVariant(variantStructure, params = {}, locale = 'en') {
  if (!variantStructure || !variantStructure.match) {
    return null;
  }

  const selectorValues = evaluateAllSelectors(variantStructure, params, locale);

  const result = findBestMatch(variantStructure.match, selectorValues);

  return result.matchKey || Object.keys(variantStructure.match)[0] || null;
}
