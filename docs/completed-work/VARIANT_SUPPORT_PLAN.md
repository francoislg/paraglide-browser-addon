# Paraglide Variants Support Plan

## Problem Statement
Current implementation is too specific - it only handles basic plural variants with hardcoded `countPlural` selector. Need to support all Paraglide variant types generically.

## Variant Types to Support

### 1. Matching Variants (Direct matching, no transformations)
```json
{
  "platform_message": [{
    "match": {
      "platform=android": "You're on Android",
      "platform=ios": "You're on iOS",
      "platform=*": "Unknown platform"
    }
  }]
}
```

**Compiled JS:**
```js
export const platform_message = (i) => {
  if (i.platform == "android") return "You're on Android";
  if (i.platform == "ios") return "You're on iOS";
  return "Unknown platform";
};
```

### 2. Pluralization Variants (cardinal)
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

**Compiled JS:**
```js
export const items_count = (i) => {
  const countPlural = registry.plural("en", i.count, {});
  if (countPlural == "one") return `You have ${i.count} item.`;
  if (countPlural == "other") return `You have ${i.count} items.`;
  return "items_count";
};
```

### 3. Ordinal Pluralization Variants
```json
{
  "finish_position": [{
    "declarations": [
      "input position",
      "local ordinal = position: plural type=ordinal"
    ],
    "selectors": ["ordinal"],
    "match": {
      "ordinal=one": "You finished {position}st",
      "ordinal=two": "You finished {position}nd",
      "ordinal=few": "You finished {position}rd",
      "ordinal=*": "You finished {position}th"
    }
  }]
}
```

**Compiled JS:**
```js
export const finish_position = (i) => {
  const ordinal = registry.plural("en", i.position, { type: "ordinal" });
  if (ordinal == "one") return `You finished ${i.position}st`;
  if (ordinal == "two") return `You finished ${i.position}nd`;
  if (ordinal == "few") return `You finished ${i.position}rd`;
  return `You finished ${i.position}th`;
};
```

### 4. Complex Multi-Selector Variants
```json
{
  "complex_message": [{
    "declarations": [
      "input count",
      "input gender",
      "local countPlural = count: plural"
    ],
    "selectors": ["countPlural", "gender"],
    "match": {
      "countPlural=one, gender=male": "He has {count} item",
      "countPlural=one, gender=female": "She has {count} item",
      "countPlural=other, gender=male": "He has {count} items",
      "countPlural=other, gender=female": "She has {count} items",
      "countPlural=*, gender=*": "They have {count} items"
    }
  }]
}
```

## Current Implementation Issues

**File:** `runtime/renderer.js` → `renderEditedPluralForm()`

**Problems:**
1. ✗ Hardcoded selector name: assumes `countPlural`
2. ✗ Only handles plural transformation, not ordinal or matching
3. ✗ Doesn't parse `declarations` to understand transformations
4. ✗ Doesn't support multiple selectors
5. ✗ Doesn't handle wildcard `*` matching
6. ✗ Assumes `count` parameter, but selectors can use any param name

## Proposed Solution

### Step 1: Parse Declarations
Extract transformation rules from `declarations` array:
- Input parameters: `"input count"` → `{type: 'input', name: 'count'}`
- Local transformations: `"local countPlural = count: plural"` →
  ```js
  {
    type: 'local',
    name: 'countPlural',
    source: 'count',
    transform: 'plural',
    options: {}
  }
  ```
- Ordinal: `"local ordinal = position: plural type=ordinal"` →
  ```js
  {
    type: 'local',
    name: 'ordinal',
    source: 'position',
    transform: 'plural',
    options: { type: 'ordinal' }
  }
  ```

### Step 2: Evaluate Selectors
For each selector in `selectors` array:
1. Check if it's an input param (use directly from `params`)
2. Check if it's a local variable (apply transformation)
3. Build selector value map: `{countPlural: "one", gender: "male"}`

### Step 3: Match Against Keys
Match keys format: `"selector1=value1, selector2=value2, ..."`
- Parse each match key into conditions
- Try exact matches first
- Fall back to wildcard `*` matches
- Support partial wildcards: `"countPlural=one, gender=*"`

### Step 4: Generic Matching Algorithm
```js
function findBestMatch(selectorValues, matchObject) {
  // selectorValues = {countPlural: "one", gender: "male"}
  // matchObject keys = ["countPlural=one, gender=male", "countPlural=*, gender=*"]

  // 1. Try exact match
  const exactKey = Object.entries(selectorValues)
    .map(([sel, val]) => `${sel}=${val}`)
    .join(', ');
  if (matchObject[exactKey]) return matchObject[exactKey];

  // 2. Try matches with wildcards (prioritize fewer wildcards)
  const candidates = Object.keys(matchObject).map(key => {
    const conditions = parseMatchKey(key); // {countPlural: "one", gender: "*"}
    const wildcardCount = Object.values(conditions).filter(v => v === '*').length;
    const matches = Object.entries(conditions).every(([sel, expectedVal]) => {
      return expectedVal === '*' || selectorValues[sel] === expectedVal;
    });
    return { key, matches, wildcardCount };
  })
  .filter(c => c.matches)
  .sort((a, b) => a.wildcardCount - b.wildcardCount);

  if (candidates.length > 0) {
    return matchObject[candidates[0].key];
  }

  // 3. Fallback: try all wildcards or first template
  const allWildcards = Object.keys(matchObject).find(k =>
    k.split(',').every(part => part.includes('=*'))
  );
  if (allWildcards) return matchObject[allWildcards];

  return Object.values(matchObject)[0];
}
```

## Implementation Plan

### Phase 1: Refactor `renderEditedPluralForm` → `renderEditedVariant`
**File:** `runtime/renderer.js`

1. Rename function to `renderEditedVariant` (more accurate name)
2. Add helper functions:
   - `parseDeclarations(declarations)` - Parse declaration strings
   - `evaluateSelectorValue(declaration, params, locale)` - Apply transformations
   - `parseMatchKey(matchKey)` - Parse "sel1=val1, sel2=val2" into object
   - `findBestMatch(selectorValues, matchObject)` - Generic matching algorithm

3. Main flow:
   ```js
   function renderEditedVariant(variantStructure, params, locale) {
     // 1. Parse declarations
     const declarations = parseDeclarations(variantStructure.declarations || []);

     // 2. Evaluate selectors
     const selectorValues = {};
     for (const selectorName of variantStructure.selectors || []) {
       const declaration = declarations.find(d => d.name === selectorName);
       if (declaration) {
         selectorValues[selectorName] = evaluateSelectorValue(declaration, params, locale);
       } else {
         // Assume it's a direct input parameter
         selectorValues[selectorName] = params[selectorName];
       }
     }

     // 3. Find matching template
     const template = findBestMatch(selectorValues, variantStructure.match);

     // 4. Substitute parameters
     return renderSimpleTemplate(template, params);
   }
   ```

### Phase 2: Update Callers
**Files:** `runtime/overlay.js`, `runtime/languageDetection.js`

Update calls from `renderEditedTemplate()` to use the new generic logic.

### Phase 3: Add Test Examples
**Files:**
- `examples/vanilla/messages/{locale}.json`
- `examples/react-router/messages/{locale}.json`
- `examples/sveltekit/messages/{locale}.json`

Add examples for:
1. Basic plural (already exists)
2. Ordinal plural (finish_position)
3. Direct matching (platform_message)
4. Multi-selector (user_activity with count and gender)

## Test Cases

### 1. Basic Plural
```js
params = {count: 1}
variant = {
  declarations: ["input count", "local countPlural = count: plural"],
  selectors: ["countPlural"],
  match: {"countPlural=one": "1 item", "countPlural=other": "{count} items"}
}
// Expected: "1 item"
```

### 2. Ordinal
```js
params = {position: 1}
variant = {
  declarations: ["input position", "local ord = position: plural type=ordinal"],
  selectors: ["ord"],
  match: {"ord=one": "{position}st", "ord=two": "{position}nd", "ord=*": "{position}th"}
}
// Expected: "1st"
```

### 3. Direct Matching
```js
params = {platform: "ios"}
variant = {
  match: {"platform=android": "Android", "platform=ios": "iOS", "platform=*": "Unknown"}
}
// Expected: "iOS"
```

### 4. Multi-Selector
```js
params = {count: 2, gender: "female"}
variant = {
  declarations: ["input count", "input gender", "local plural = count: plural"],
  selectors: ["plural", "gender"],
  match: {
    "plural=one, gender=male": "He has 1",
    "plural=one, gender=female": "She has 1",
    "plural=other, gender=*": "They have {count}"
  }
}
// Expected: "They have 2"
```

## Files to Modify

1. **`runtime/renderer.js`** - Core implementation (200-300 lines)
2. **`runtime/overlay.js`** - Update callers
3. **`runtime/languageDetection.js`** - Update callers
4. **`examples/vanilla/messages/en.json`** - Add variant examples
5. **`examples/vanilla/messages/es.json`** - Add variant examples
6. **`examples/vanilla/messages/fr.json`** - Add variant examples
7. **`examples/react-router/messages/*.json`** - Add variant examples
8. **`examples/sveltekit/messages/*.json`** - Add variant examples

## Success Criteria

- [ ] Supports direct matching variants (no transformations)
- [ ] Supports cardinal pluralization (`plural`)
- [ ] Supports ordinal pluralization (`plural type=ordinal`)
- [ ] Supports multiple selectors
- [ ] Handles wildcard `*` matching correctly
- [ ] Prioritizes exact matches over wildcard matches
- [ ] All test cases pass
- [ ] Example apps demonstrate all variant types
