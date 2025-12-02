/**
 * Paraglide Browser Debug Client API
 *
 * This module provides runtime tracking of translated elements in the DOM
 * for use by browser extensions and debugging tools.
 */

/**
 * Metadata about a translated message
 */
export interface TranslationMetadata {
  /** The message key (e.g., "welcome", "greeting") */
  key: string;
  /** Parameters passed to the message function */
  params: Record<string, any>;
  /** Timestamp when the translation was called */
  timestamp: number;
}

/**
 * A tracked DOM element with translation metadata
 */
export interface TrackedElement {
  /** The DOM element containing the translated text */
  element: HTMLElement;
  /** The text node within the element */
  textNode?: Text;
  /** The translated text content */
  text: string;
  /** The message key */
  key: string;
  /** Parameters passed to the message function */
  params: Record<string, any>;
}

/**
 * Global API for Paraglide browser debugging
 */
export interface ParaglideBrowserDebug {
  /**
   * Registry mapping translated text to metadata
   * Key: translated text string
   * Value: translation metadata
   */
  registry: Map<string, TranslationMetadata>;

  /**
   * Array of tracked elements (populated by scanner)
   * Note: May contain stale references after re-renders
   */
  elements: TrackedElement[];

  /**
   * Manually trigger a re-scan of the DOM to update tracked elements
   */
  refresh(): void;

  /**
   * Get fresh list of elements by querying data attributes
   * This re-queries the DOM and returns current element references
   */
  getElements(): TrackedElement[];
}

declare global {
  interface Window {
    /**
     * Paraglide Browser Debug API
     * Only available when VITE_PARAGLIDE_BROWSER_DEBUG=true
     */
    __paraglideBrowserDebug?: ParaglideBrowserDebug;
  }
}

export {};
