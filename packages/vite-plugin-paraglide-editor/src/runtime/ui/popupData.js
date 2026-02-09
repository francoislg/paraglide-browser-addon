/**
 * Popup Data Preparation
 *
 * Functions for fetching and preparing translation data for the edit popup
 * Separated from popup.js for better testability and maintainability
 */

import { getTranslationVersions } from '../dataStore.js';
import { getCurrentLocale } from '../languageDetection.js';
import { getSelectedLanguages } from '../helpers.js';
import { detectActiveVariant, parseVariantStructure } from '../variants.js';

/**
 * Build language input data for all selected languages
 * Gets both server and edited versions from dataStore
 *
 * @param {string} key - Translation key
 * @param {string[]} selectedLanguages - Languages to include (sorted with current first)
 * @returns {Array} Language input data array
 */
export function buildLanguageInputData(key, selectedLanguages) {
  const languageInputs = [];
  const currentLocale = getCurrentLocale();

  for (const locale of selectedLanguages) {
    const versions = getTranslationVersions(locale, key);

    const displayValue = versions.current;

    let pluralData = parseVariantStructure(displayValue);

    // Deep clone if it came from an array to avoid mutations
    if (pluralData && Array.isArray(displayValue)) {
      pluralData = JSON.parse(JSON.stringify(pluralData));
    }

    const entry = {
      locale,
      isCurrent: locale === currentLocale,
      pluralData,
      displayValue,
      isEdited: versions.isEdited,
      serverValue: versions.server
    };

    languageInputs.push(entry);
  }

  return languageInputs;
}

/**
 * Detect variant information from language inputs
 * Determines if plural, extracts variant forms, finds active variant
 *
 * @param {Array} languageInputs - Language input data from buildLanguageInputData
 * @param {Object} params - Translation parameters
 * @param {string} currentLocale - Current locale
 * @returns {Object} Variant info: {isPlural, variantForms, activeVariantKey}
 */
export function detectVariantInfo(languageInputs, params, currentLocale) {
  let isPlural = false;
  let variantForms = [];
  let activeVariantKey = null;

  const firstPluralInput = languageInputs.find(input => input.pluralData);

  if (firstPluralInput) {
    isPlural = true;
    variantForms = Object.keys(firstPluralInput.pluralData.match || {});

    if (variantForms.length > 0 && params && Object.keys(params).length > 0) {
      activeVariantKey = detectActiveVariant(
        firstPluralInput.pluralData,
        params,
        currentLocale
      );
    }
  }

  return { isPlural, variantForms, activeVariantKey };
}

/**
 * Prepare all data needed for edit popup
 * Single function that orchestrates data loading
 *
 * @param {string} key - Translation key
 * @param {Object} params - Translation parameters
 * @returns {Object} Complete popup data
 */
export async function preparePopupData(key, params) {
  const currentLocale = getCurrentLocale();

  let selectedLanguages = getSelectedLanguages();
  selectedLanguages = selectedLanguages.sort((a, b) => {
    if (a === currentLocale) return -1;
    if (b === currentLocale) return 1;
    return a.localeCompare(b);
  });

  const languageInputs = buildLanguageInputData(key, selectedLanguages);

  const variantInfo = detectVariantInfo(languageInputs, params, currentLocale);

  return {
    currentLocale,
    selectedLanguages,
    languageInputs,
    ...variantInfo
  };
}
