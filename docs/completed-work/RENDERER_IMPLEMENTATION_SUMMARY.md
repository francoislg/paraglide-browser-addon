# Renderer Implementation Summary

## Overview
Created a comprehensive `renderVariant()` function that handles all Paraglide variant types, replicating the exact logic used in Paraglide's compiled output.

## Implementation Details

### Core Function: `renderVariant(variant, params, locale)`

Located in: `packages/vite-plugin-paraglide-debug/src/runtime/renderer.js`

This function handles:
1. **Direct Matching Variants** (no transformations)
2. **Cardinal Plural Variants** (`plural`)
3. **Ordinal Plural Variants** (`plural type=ordinal`)
4. **Multi-Selector Variants** (multiple conditions)

## How It Works

### 1. Parse Declarations
```javascript
parseDeclarations(['input count', 'local countPlural = count: plural'])
→ [
    {type: 'input', name: 'count'},
    {type: 'local', name: 'countPlural', source: 'count', transform: 'plural', options: {}}
  ]
```

Handles:
- Input parameters: `"input count"` → identifies direct parameters
- Local transformations: `"local countPlural = count: plural"` → identifies transformations
- Options: `"type=ordinal"` → parses transformation options

### 2. Evaluate Selectors
```javascript
evaluateSelector(declaration, params, locale)
```

For each selector:
- If it's a local transformation (e.g., `countPlural`), apply the transformation:
  - `plural` → Uses `Intl.PluralRules(locale).select(value)` → returns "one", "other", "few", etc.
  - `plural type=ordinal` → Uses `Intl.PluralRules(locale, {type: 'ordinal'}).select(value)` → returns "one", "two", "few", "other"
- If it's a direct parameter (e.g., `gender`), use the value from params

Result: `{countPlural: "one", gender: "male"}`

### 3. Find Best Match
```javascript
findBestMatchingTemplate(match, selectorValues, selectors)
```

Processes match keys in order (Paraglide generates them from most specific to most general):
- Parse match key: `"countPlural=one, gender=male"` → `{countPlural: "one", gender: "male"}`
- Check conditions:
  - Wildcard `*` always matches
  - Exact values must match exactly
- Return first matching template

### 4. Substitute Parameters
```javascript
renderSimpleTemplate(template, params)
```

Replace `{param}` placeholders with actual values.

## Comparison with Paraglide Output

### Example 1: Basic Plural

**Input JSON:**
```json
{
  "items_count": [{
    "declarations": ["input count", "local countPlural = count: plural"],
    "selectors": ["countPlural"],
    "match": {
      "countPlural=one": "You have {count} item.",
      "countPlural=other": "You have {count} items."
    }
  }]
}
```

**Paraglide Compiles To:**
```javascript
const en_items_count = (i) => {
  const countPlural = registry.plural("en", i.count, {});
  if (countPlural == "one") return `You have ${i.count} item.`;
  if (countPlural == "other") return `You have ${i.count} items.`;
  return "items_count";
};
```

**Our Implementation:**
```javascript
renderVariant(variant, {count: 5}, 'en')
→ declarations: [{type: 'local', name: 'countPlural', source: 'count', transform: 'plural'}]
→ evaluateSelector: countPlural = Intl.PluralRules('en').select(5) = "other"
→ selectorValues: {countPlural: "other"}
→ findBestMatch: "countPlural=other" matches
→ renderSimpleTemplate: "You have {count} items." → "You have 5 items."
```

### Example 2: Ordinal Plural

**Input JSON:**
```json
{
  "finish_position": [{
    "declarations": ["input position", "local ordinal = position: plural type=ordinal"],
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

**Paraglide Compiles To:**
```javascript
const en_finish_position = (i) => {
  const ordinal = registry.plural("en", i.position, { type: "ordinal" });
  if (ordinal == "one") return `You finished ${i.position}st place!`;
  if (ordinal == "two") return `You finished ${i.position}nd place!`;
  if (ordinal == "few") return `You finished ${i.position}rd place!`;
  return `You finished ${i.position}th place!`
};
```

**Our Implementation:**
```javascript
renderVariant(variant, {position: 1}, 'en')
→ declarations: [{type: 'local', name: 'ordinal', source: 'position', transform: 'plural', options: {type: 'ordinal'}}]
→ evaluateSelector: ordinal = Intl.PluralRules('en', {type: 'ordinal'}).select(1) = "one"
→ selectorValues: {ordinal: "one"}
→ findBestMatch: "ordinal=one" matches
→ renderSimpleTemplate: "You finished {position}st place!" → "You finished 1st place!"
```

### Example 3: Direct Matching

**Input JSON:**
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

**Paraglide Compiles To:**
```javascript
const en_platform_message = (i) => {
  if (i.platform == "android") return `You're using Android`;
  if (i.platform == "ios") return `You're using iOS`;
  if (i.platform == "web") return `You're using a web browser`;
  return `Unknown platform`
};
```

**Our Implementation:**
```javascript
renderVariant(variant, {platform: 'ios'}, 'en')
→ declarations: [] (no transformations)
→ selectors: ['platform'] (direct parameter)
→ selectorValues: {platform: "ios"}
→ findBestMatch: "platform=ios" matches
→ template: "You're using iOS"
```

### Example 4: Multi-Selector

**Input JSON:**
```json
{
  "user_activity": [{
    "declarations": ["input count", "input gender", "local countPlural = count: plural"],
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

**Paraglide Compiles To:**
```javascript
const en_user_activity = (i) => {
  const countPlural = registry.plural("en", i.count, {});
  if (countPlural == "one" && i.gender == "male") return `He posted ${i.count} photo`;
  if (countPlural == "one" && i.gender == "female") return `She posted ${i.count} photo`;
  if (countPlural == "one") return `They posted ${i.count} photo`;
  if (countPlural == "other" && i.gender == "male") return `He posted ${i.count} photos`;
  if (countPlural == "other" && i.gender == "female") return `She posted ${i.count} photos`;
  return `They posted ${i.count} photos`
};
```

**Our Implementation:**
```javascript
renderVariant(variant, {count: 2, gender: 'female'}, 'en')
→ declarations: [
    {type: 'input', name: 'count'},
    {type: 'input', name: 'gender'},
    {type: 'local', name: 'countPlural', source: 'count', transform: 'plural'}
  ]
→ evaluateSelector: countPlural = Intl.PluralRules('en').select(2) = "other"
→ selectorValues: {countPlural: "other", gender: "female"}
→ findBestMatch:
    - "countPlural=one, gender=male" → no match (countPlural doesn't match)
    - "countPlural=one, gender=female" → no match (countPlural doesn't match)
    - "countPlural=one, gender=*" → no match (countPlural doesn't match)
    - "countPlural=other, gender=male" → no match (gender doesn't match)
    - "countPlural=other, gender=female" → MATCH! ✓
→ renderSimpleTemplate: "She posted {count} photos" → "She posted 2 photos"
```

## Key Features

### ✅ Accurate Replication
- Matches Paraglide's exact logic and behavior
- Uses same `Intl.PluralRules` API
- Processes conditions in order (most specific first)
- Handles wildcards correctly

### ✅ Generic Support
- Not hardcoded to specific selector names
- Supports any number of selectors
- Extensible for future transformation types

### ✅ Edge Cases Handled
- Missing selectors (uses first match as fallback)
- Wildcard matching
- Multi-selector with partial wildcards
- Empty or invalid variant structures

## Testing

The implementation can now handle all variant types in the example projects:
- Vanilla: http://localhost:3210
- React Router: http://localhost:3220
- SvelteKit: http://localhost:3230

All localization files have been updated with comprehensive variant examples across all three projects.

## Files Modified

1. **`packages/vite-plugin-paraglide-debug/src/runtime/renderer.js`** - Core implementation
2. **`examples/vanilla/messages/{en,es,fr}.json`** - Added variant examples
3. **`examples/react-router/messages/{en,es,fr}.json`** - Added variant examples
4. **`examples/sveltekit/messages/{en,es,fr}.json`** - Added variant examples
5. **`VARIANT_SUPPORT_PLAN.md`** - Comprehensive plan and documentation
