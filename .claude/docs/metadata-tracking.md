# Metadata Tracking for Paraglide Browser Addon

## Problem Statement

We need to track which DOM elements contain translated text so a browser extension can:
1. Highlight elements on hover
2. Show translation keys and parameters
3. Allow in-context editing of translations

**Requirements:**
- Zero developer friction - just use `m.key()` normally
- No regex parsing (fragile and error-prone)
- Works across React, Svelte, and vanilla JS
- No manual wrapping or special components

## Why HTML Comments Don't Work (Without Babel)

### Initial Approach
The Vite plugin wraps message functions to return HTML with comments:

```javascript
function __debugWrap(text, key, params) {
  return `<!-- paraglide:${key} -->${text}<!-- /paraglide:${key} -->`;
}
```

### The Problem
React escapes HTML in JSX expressions by default:

```jsx
// Developer writes:
<h3>{m.language_switcher()}</h3>

// React renders (escaped):
<h3>&lt;!-- paraglide:key --&gt;Welcome&lt;!-- /paraglide:key --&gt;</h3>
```

The HTML comments become visible text instead of actual HTML comments.

### Why Babel Was Needed
To preserve HTML comments, we need `dangerouslySetInnerHTML`:

```jsx
<h3 dangerouslySetInnerHTML={{ __html: m.language_switcher() }} />
```

But this requires transforming the source code at build time using Babel.

**Decision:** We rejected Babel because:
- Vite + React uses esbuild by default (not Babel)
- Adding Babel increases build complexity
- Different frameworks need different transformers (React Babel, Svelte preprocessor, etc.)

## Solution: Runtime Text Mapping

Instead of embedding metadata in HTML, we use a **runtime registry** that maps text content to translation metadata.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BUILD TIME: Vite Plugin Wraps Message Functions          │
│    m.key() → __debugWrap(originalFn(), "key", params)       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RUNTIME: Wrapper Stores Text → Metadata Mapping          │
│    window.__paraglideRegistry.set(text, { key, params })    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RUNTIME: Scanner Matches Text Nodes to Metadata          │
│    TextNode("Welcome") → lookup → { key: "welcome" }        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. OUTPUT: window.paraglideElements Array                    │
│    [{ element, text, key, params }, ...]                     │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### 1. Vite Plugin Wrapper Function

```javascript
// In packages/vite-plugin-paraglide-debug/src/index.js
function __debugWrap(text, key, params) {
  if (typeof text !== 'string') return text;

  // Store mapping in global registry
  if (typeof window !== 'undefined') {
    window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
    window.__paraglideBrowserDebug.registry = window.__paraglideBrowserDebug.registry || new Map();
    window.__paraglideBrowserDebug.registry.set(text, {
      key: key,
      params: params || {},
      timestamp: Date.now()
    });
  }

  // Return plain text (no HTML manipulation)
  return text;
}
```

#### 2. Runtime DOM Scanner

Injected via Vite plugin's `transformIndexHtml`:

```javascript
function buildElementRegistry() {
  if (!window.__paraglideBrowserDebug.registry) return;

  const registry = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script/style tags
        const parent = node.parentElement?.tagName;
        if (parent === 'SCRIPT' || parent === 'STYLE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let textNode;
  while (textNode = walker.nextNode()) {
    const text = textNode.textContent.trim();
    if (!text) continue;

    const metadata = window.__paraglideBrowserDebug.registry.get(text);
    if (metadata) {
      const element = textNode.parentElement;

      // Add data attributes for persistence
      if (element && !element.dataset.paraglideKey) {
        element.dataset.paraglideKey = metadata.key;
        if (metadata.params && Object.keys(metadata.params).length > 0) {
          element.dataset.paraglideParams = JSON.stringify(metadata.params);
        }
      }

      registry.push({
        element: element,
        textNode: textNode,
        text: text,
        key: metadata.key,
        params: metadata.params
      });
    }
  }

  window.__paraglideBrowserDebug.elements = registry;
  console.log(`[paraglide-debug] Found ${registry.length} translated elements`);
}
```

#### 3. MutationObserver for Dynamic Updates

React/Svelte re-render frequently, so we need to detect changes:

```javascript
// Debounced re-scan on DOM mutations
let scanTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(buildElementRegistry, 100);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
```

#### 4. Initial Scan

```javascript
// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildElementRegistry);
} else {
  buildElementRegistry();
}
```

## Usage in Browser Extension

The browser extension can access the tracked elements via the `window.__paraglideBrowserDebug` namespace:

```javascript
// Content script in browser extension

// Check available API
console.log(window.__paraglideBrowserDebug);
// {
//   registry: Map (text → metadata),
//   elements: Array of tracked elements,
//   refresh: Function to re-scan DOM,
//   getElements: Function to get fresh elements
// }

// Get elements array
console.log(window.__paraglideBrowserDebug.elements);
// [
//   {
//     element: <h3> DOM node,
//     textNode: #text node,
//     text: "Welcome",
//     key: "welcome",
//     params: { name: "John" }
//   },
//   ...
// ]

// Or get fresh elements (re-queries DOM)
const elements = window.__paraglideBrowserDebug.getElements();

// Highlight elements on hover
elements.forEach(({ element, key }) => {
  element.addEventListener('mouseenter', () => {
    element.style.outline = '2px solid orange';
    showTooltip(element, key);
  });
});
```

## Limitations & Trade-offs

### 1. Non-Unique Text
If multiple elements have identical translated text, they'll all match the same metadata:

```jsx
<h1>{m.title()}</h1>  // "Welcome"
<p>{m.greeting()}</p>  // "Welcome" (same text, different key)
```

**Mitigation:** Use timestamp to prefer more recent calls, or accept that duplicates share metadata.

### 2. Performance
Scanning the entire DOM on every mutation could be slow on large pages.

**Mitigation:**
- Debounce scans (100ms)
- Skip script/style tags
- Only scan changed subtrees (future optimization)

### 3. Text Changes
If translation text changes after initial scan, registry mapping breaks.

**Example:**
```javascript
// Initial: m.count({ n: 1 }) → "1 item"
window.__paraglideRegistry.set("1 item", { key: "count" })

// After user action: m.count({ n: 2 }) → "2 items"
// Old mapping still exists but won't match "2 items"
```

**Mitigation:** Registry uses latest text, old entries become stale (acceptable for debug mode).

### 4. Memory Leaks
Registry grows unbounded as translations are called.

**Mitigation:**
- Clear old entries periodically
- Use WeakMap (future optimization)
- Only runs in debug mode

## Alternative Approaches Considered

### A. Babel/esbuild Transform (Rejected)
- **Pro:** Can inject data attributes directly in JSX
- **Con:** Different transformer per framework
- **Con:** Adds build complexity

### B. Static Analysis + ID Injection (Complex)
- Scan source files for `m.key()` calls
- Generate unique IDs per call site
- Inject IDs as parameters: `m.key({ __debugId: "abc123" })`
- **Pro:** Accurate tracking of call sites
- **Con:** Very complex, fragile with dynamic keys

### C. Proxy Pattern (Rejected)
- Wrap `m` object in Proxy to intercept all property access
- **Pro:** No function wrapping needed
- **Con:** Can't track where proxy was called from

## Implementation Checklist

- [ ] Update Vite plugin wrapper to use registry instead of HTML comments
- [ ] Create runtime scanner script
- [ ] Inject scanner via `transformIndexHtml`
- [ ] Add MutationObserver for dynamic updates
- [ ] Remove Babel plugin references
- [ ] Test with React Router example
- [ ] Test with Svelte example
- [ ] Test with vanilla JS example
- [ ] Document browser extension integration

## Future Enhancements

1. **Call Site Tracking:** Use `Error().stack` to capture where `m.key()` was called
2. **Smarter Matching:** Use fuzzy matching or edit distance for similar text
3. **Performance:** Only scan changed DOM subtrees
4. **Memory Management:** Implement LRU cache for registry
5. **Source Maps:** Map keys back to source file locations
