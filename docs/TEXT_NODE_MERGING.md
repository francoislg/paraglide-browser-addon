# TextNode Merging Corner Case

## Problem

The editor plugin detects translations by matching DOM text node content against a registry of known message function outputs. This uses exact string equality via `Map.get(text)` in `buildElementRegistry()`.

This breaks when a framework (e.g. Svelte) merges a translation expression with adjacent literal text into a **single text node**.

### Example

Template:
```svelte
<span>{m.createrecipe_titleLabel()}*</span>
```

- `__editorWrap` stores `"Titre"` in the registry (the message function's return value)
- The DOM may contain a single text node: `"Titre*"`
- `registry.get("Titre*")` returns `undefined` — no match

Meanwhile, a bare expression works fine:
```svelte
{m.createrecipe_descriptionLabel()}
```
- DOM text node: `"Description"` — exact match against registry

### When It Happens

Any time literal text is adjacent to a message function call in a template:
- `{m.key()}*` (required field marker)
- `{m.key()}: ` (label with colon)
- `{m.key()} -` (separator)
- `{m.key()}!` (punctuation)

Whether the framework creates **one merged text node** or **two separate text nodes** depends on the compiler. Svelte 5 may merge them; React typically keeps them separate via JSX concatenation semantics.

## Current Behavior

`buildElementRegistry()` in `registry.js` uses a `TreeWalker` with `NodeFilter.SHOW_TEXT` and does exact `Map.get()` lookups. If the text node content doesn't exactly match a registry key, the element is silently skipped.

## Proposed Solution

Add a **substring fallback** after the exact match fails:

```js
let metadata = registry.get(text);
if (!metadata) {
  let bestMatch = null;
  for (const [registered, meta] of registry) {
    if (registered.length >= 3 && text.includes(registered)) {
      if (!bestMatch || registered.length > bestMatch[0].length) {
        bestMatch = [registered, meta];
      }
    }
  }
  if (bestMatch) metadata = bestMatch[1];
}
```

### Design Notes

- **Exact match stays O(1)** for the common case (vast majority of translations)
- **Substring fallback is O(n)** but only triggers when exact match fails
- `length >= 3` guards against false positives (e.g. `"OK"` matching inside `"BOOK"`)
- **Longest match wins** to avoid ambiguity when multiple registry values are substrings
- May want a ratio check too (e.g. match must be >50% of text node length) to further reduce false positives

### Open Questions

- Should the matched substring offset be stored so the popup editor knows which part of the text is editable?
- Should there be a visual indicator that the match was approximate (not exact)?
- Need to verify Svelte 5's compiled output — does `{expr}literal` always merge, or only in certain cases?

## Workaround (For App Authors)

Wrap the translation and the literal text in separate elements:
```svelte
<span>{m.createrecipe_titleLabel()}</span><span>*</span>
```

This guarantees separate text nodes regardless of framework behavior.

## Related Files

- `packages/vite-plugin-paraglide-editor/src/runtime/registry.js` — `buildElementRegistry()`
- `packages/vite-plugin-paraglide-editor/src/index.js` — `__editorWrap` stores text in registry
