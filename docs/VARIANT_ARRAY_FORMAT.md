# Paraglide Variant Array Format

## Overview

This document explains Paraglide JS's variant/plural array structure and establishes conventions for handling it in our codebase.

## Format Specification

### The Array Wrapper

In Paraglide, **all variants are stored as single-element arrays**:

```json
{
  "simple_translation": "Hello, world!",
  "variant_translation": [{
    "declarations": [...],
    "selectors": [...],
    "match": {...}
  }]
}
```

The variant object is **always** wrapped in an array, even though there's only ever one element.

### Variant Structure

```typescript
type VariantTranslation = [{
  declarations?: string[];  // Optional: Input params and transformations
  selectors?: string[];     // Optional: Which selectors to match on
  match: {                  // Required: Conditional templates
    [matchKey: string]: string;
  };
}];
```

## Why Arrays?

### 1. Consistency with Message Format

Paraglide's message format specification uses arrays to distinguish between:
- Simple strings: `"Hello"`
- Variant translations: `[{match: {...}}]`

This makes it trivial to detect variants: check if value is an array.

### 2. Future Extensibility

While current Paraglide only uses single-element arrays, the array structure allows for potential future features:
- Multiple variant strategies per key
- Fallback variant definitions
- Composition of variant rules

### 3. JSON Schema Validation

Arrays make it easier to validate the structure:
```json
{
  "type": "array",
  "items": { "type": "object", "required": ["match"] },
  "minItems": 1,
  "maxItems": 1
}
```

## Real-World Examples

### 1. Cardinal Pluralization

```json
{
  "items_count": [{
    "declarations": [
      "input count",
      "local countPlural = count: plural"
    ],
    "selectors": ["countPlural"],
    "match": {
      "countPlural=one": "You have {count} item.",
      "countPlural=other": "You have {count} items."
    }
  }]
}
```

**Usage**: `items_count({count: 5})` → "You have 5 items."

### 2. Ordinal Pluralization

```json
{
  "finish_position": [{
    "declarations": [
      "input position",
      "local ordinal = position: plural type=ordinal"
    ],
    "selectors": ["ordinal"],
    "match": {
      "ordinal=one": "You finished {position}st place!",
      "ordinal=two": "You finished {position}nd place!",
      "ordinal=few": "You finished {position}rd place!",
      "ordinal=*": "You finished {position}th place!"
    }
  }]
}
```

**Usage**: `finish_position({position: 2})` → "You finished 2nd place!"

### 3. Direct Matching (No Declarations)

```json
{
  "platform_message": [{
    "match": {
      "platform=android": "You're using Android",
      "platform=ios": "You're using iOS",
      "platform=web": "You're using a web browser",
      "platform=*": "Unknown platform"
    }
  }]
}
```

**Usage**: `platform_message({platform: 'ios'})` → "You're using iOS"

**Note**: No `declarations` or `selectors` fields - direct parameter matching.

### 4. Multi-Selector Variants

```json
{
  "user_activity": [{
    "declarations": [
      "input count",
      "input gender",
      "local countPlural = count: plural"
    ],
    "selectors": ["countPlural", "gender"],
    "match": {
      "countPlural=one, gender=male": "He posted {count} photo",
      "countPlural=one, gender=female": "She posted {count} photo",
      "countPlural=one, gender=*": "They posted {count} photo",
      "countPlural=other, gender=male": "He posted {count} photos",
      "countPlural=other, gender=female": "She posted {count} photos",
      "countPlural=*, gender=*": "They posted {count} photos"
    }
  }]
}
```

**Usage**: `user_activity({count: 1, gender: 'female'})` → "She posted 1 photo"

## Storage Formats in Our System

Variants appear in different formats across our codebase:

### 1. Server Translations (dataStore)

From `/@paraglide-debug/langs.json`:
```javascript
{
  "items_count": [{  // Native JavaScript array
    declarations: [...],
    selectors: [...],
    match: {...}
  }]
}
```

**Type**: `Array<VariantStructure>`

### 2. IndexedDB (User Edits)

Stored as JSON string:
```javascript
{
  locale: "en",
  key: "items_count",
  editedValue: '[{"declarations":[...],"selectors":[...],"match":{...}}]'
}
```

**Type**: `string` (JSON-serialized array)

### 3. In-Memory Cache (dataStore)

Can be either format depending on source:
```javascript
localEdits.get("en:items_count")
// → Could be array OR JSON string
```

**Type**: `Array<VariantStructure> | string`

## Parsing Strategy

### The `parseVariantStructure()` Utility

Located in `variants.js`, this function handles all variant parsing:

```javascript
export function parseVariantStructure(value) {
  if (!value) return null;

  // Already an array with variant structure
  if (Array.isArray(value) && value[0]?.match) {
    return value[0];  // Extract first (and only) element
  }

  // JSON string format
  if (typeof value === 'string' && value.trim().startsWith('[{')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed[0]?.match) {
        return parsed[0];
      }
    } catch {
      return null;
    }
  }

  return null;
}
```

### When to Use It

**Always** use `parseVariantStructure()` when:
1. Getting variant data from dataStore or IndexedDB
2. Passing variant data to `detectActiveVariant()` or `renderVariant()`
3. Comparing variant structures between edited and server versions
4. Any time you need the variant object (not the array wrapper)

### Why Extract `[0]`?

Functions like `detectActiveVariant()` and `renderVariant()` expect the **variant structure object**, not the array:

```javascript
// ❌ Wrong - passing the array
detectActiveVariant(value, params, locale);  // value = [{...}]

// ✅ Correct - passing the object
detectActiveVariant(value[0], params, locale);  // value[0] = {...}

// ✅ Best - using utility
const variant = parseVariantStructure(value);
detectActiveVariant(variant, params, locale);
```

## Best Practices

### 1. Always Use the Utility

```javascript
// ❌ Don't manually extract
const variant = Array.isArray(value) ? value[0] : JSON.parse(value)[0];

// ✅ Do use the utility
const variant = parseVariantStructure(value);
```

### 2. Never Assume Multiple Elements

```javascript
// ❌ Don't iterate
value.forEach(variant => {...});

// ✅ Do extract single element
const variant = parseVariantStructure(value);
```

### 3. Check for null

```javascript
const variant = parseVariantStructure(value);
if (!variant) {
  // Not a variant, handle as simple string
  return;
}
```

### 4. Deep Clone When Mutating

If you get the variant from an array (not JSON string), deep clone before mutating:

```javascript
const variant = parseVariantStructure(displayValue);
if (variant && Array.isArray(displayValue)) {
  // Deep clone to avoid mutating dataStore
  variant = JSON.parse(JSON.stringify(variant));
}
```

## Code Patterns in Our Codebase

### 1. Popup Data Preparation (popupData.js)

```javascript
const versions = getTranslationVersions(locale, key);
const variant = parseVariantStructure(versions.current);

if (variant && Array.isArray(versions.current)) {
  // Deep clone if from array
  variant = JSON.parse(JSON.stringify(variant));
}
```

### 2. Element Refresh (overlay.js)

```javascript
const editedVariant = parseVariantStructure(versions.edited);
const serverVariant = parseVariantStructure(versions.server);

if (editedVariant && serverVariant) {
  const activeKey = detectActiveVariant(editedVariant, params, locale);
  // Compare only active variant's text
  if (editedVariant.match[activeKey] === serverVariant.match[activeKey]) {
    // This variant not edited
  }
}
```

### 3. Rendering (renderer.js)

```javascript
if (typeof template === 'string' && template.trim().startsWith('[{')) {
  const variant = parseVariantStructure(template);
  if (variant) {
    return renderVariant(variant, params, locale);
  }
}
```

## Testing Considerations

When writing tests for variant handling:

```javascript
// Test with array format
const arrayFormat = [{
  match: {
    "count=one": "1 item",
    "count=other": "{count} items"
  }
}];

// Test with JSON string format
const jsonFormat = '[{"match":{"count=one":"1 item","count=other":"{count} items"}}]';

// Test with simple string (should return null)
const simpleString = "Hello";

// All should work with parseVariantStructure()
expect(parseVariantStructure(arrayFormat)).toBeTruthy();
expect(parseVariantStructure(jsonFormat)).toBeTruthy();
expect(parseVariantStructure(simpleString)).toBeNull();
```

## References

- [Paraglide Variants Documentation](https://inlang.com/m/gerre34r/library-inlang-paraglideJs/variants)
- `variants.js` - Variant rendering and detection logic
- `parseVariantStructure()` - Utility function for parsing variant arrays
- `detectActiveVariant()` - Finds which variant is currently active
- `renderVariant()` - Renders a variant with parameters

## Summary

- **Always** single-element arrays: `[{...}]`
- **Always** use `parseVariantStructure()` to extract the object
- **Never** assume multiple elements
- Handle both array and JSON string formats
- Deep clone when mutating array-sourced variants
- Check for `null` return value before using

This structure is part of Paraglide's official specification and provides consistency, future extensibility, and clear type distinction between simple and variant translations.
