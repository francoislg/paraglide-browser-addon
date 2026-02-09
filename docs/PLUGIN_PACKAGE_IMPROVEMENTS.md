# Plugin Package Improvements

**Date**: 2025-12-03
**Package**: `packages/vite-plugin-paraglide-editor`
**Status**: Recommendations for improving package structure and publishability

## Executive Summary

The `vite-plugin-paraglide-editor` package has a solid foundation but needs several improvements before being published to npm. This document outlines 12 key issues and provides actionable recommendations.

## Issues Identified

### 1. Missing LICENSE File

**Problem**:
- `package.json` specifies `"license": "MIT"`
- No `LICENSE` or `LICENSE.md` file exists in the package
- NPM publishing best practices require license file
- Legal ambiguity for users

**Impact**: ⚠️ HIGH
- Users cannot verify license terms
- May prevent package from being used in corporate environments
- NPM will show a warning during publish

**Recommendation**:
```bash
# Create LICENSE file
cat > packages/vite-plugin-paraglide-editor/LICENSE << 'EOF'
MIT License

Copyright (c) 2025 [Your Name/Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

Update `package.json` files field:
```json
"files": [
  "src",
  "client.d.ts",
  "LICENSE"
]
```

---

### 2. Invalid `files` Field in package.json

**Problem**:
- `package.json` lists `"runtime.js"` in the `files` array
- This file **does not exist** at package root
- Will cause npm publish warnings/errors
- Actual runtime code is at `src/runtime.js`

**Current `package.json` files field**:
```json
"files": [
  "src",
  "runtime.js",    ← DOES NOT EXIST
  "client.d.ts"
]
```

**Impact**: ⚠️ MEDIUM
- npm publish will warn about missing file
- Could confuse users looking for entry points

**Recommendation**:
```json
"files": [
  "src",
  "client.d.ts",
  "LICENSE"
]
```

The `src` directory already contains `src/runtime.js`, so it's included.

---

### 3. Missing Package Metadata

**Problem**:
- `package.json` missing critical fields:
  - `author` is empty string
  - No `repository` field
  - No `homepage` field
  - No `bugs` field
  - No `engines` field

**Current**:
```json
{
  "name": "vite-plugin-paraglide-editor",
  "author": "",
  "license": "MIT"
}
```

**Impact**: ⚠️ MEDIUM
- Harder to discover on npm
- No way for users to report issues
- Missing on npm package page sidebar
- Reduces trust and professionalism

**Recommendation**:
```json
{
  "name": "vite-plugin-paraglide-editor",
  "version": "0.1.0",
  "description": "Vite plugin that injects editor metadata into ParaglideJS translation strings",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/paraglide-browser-addon.git",
    "directory": "packages/vite-plugin-paraglide-editor"
  },
  "homepage": "https://github.com/yourusername/paraglide-browser-addon#readme",
  "bugs": {
    "url": "https://github.com/yourusername/paraglide-browser-addon/issues"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "vite",
    "plugin",
    "paraglide",
    "i18n",
    "internationalization",
    "debug",
    "metadata",
    "translation",
    "localization"
  ]
}
```

---

### 4. Missing .gitignore

**Problem**:
- No `.gitignore` in the package directory
- Could accidentally commit:
  - `node_modules/` (if dependencies added)
  - `.DS_Store` files
  - Editor temp files
  - Test coverage reports

**Impact**: ⚠️ LOW
- Minor risk, but good practice
- Follows workspace isolation principle

**Recommendation**:
```bash
cat > packages/vite-plugin-paraglide-editor/.gitignore << 'EOF'
# Dependencies
node_modules/

# Build output (if build step added)
dist/
*.tsbuildinfo

# Test coverage
coverage/
.nyc_output/

# OS files
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo

# Temp files
*.tmp
*.log
EOF
```

---

### 5. No CHANGELOG

**Problem**:
- No `CHANGELOG.md` to track version history
- Users won't know what changed between versions
- Best practice for npm packages

**Impact**: ⚠️ MEDIUM
- Difficult for users to understand breaking changes
- Missing from npm package page

**Recommendation**:
```bash
cat > packages/vite-plugin-paraglide-editor/CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of editor metadata injection
- Runtime DOM element tracking
- TypeScript type definitions
- Browser extension API support
- Multi-framework support (React, SvelteKit, Vue, vanilla JS)
- Variant support (plural, ordinal, direct matching)
- Conflict detection for translation edits
- Export/import functionality

## [0.1.0] - 2025-12-03

### Added
- Initial release
- Basic Vite plugin for Paraglide editor metadata
- Virtual module system for runtime code
- Debug middleware for serving translations
- HTML transformation hooks
EOF
```

Add to `package.json` files:
```json
"files": [
  "src",
  "client.d.ts",
  "LICENSE",
  "CHANGELOG.md"
]
```

---

### 6. No Tests

**Problem**:
- No test files or test infrastructure
- No `test` script in `package.json`
- Cannot verify plugin works correctly
- Risky to publish without tests

**Impact**: ⚠️ HIGH
- High risk of regressions
- Difficult to maintain confidently
- Users may lose trust if bugs discovered

**Recommendation**:

**Option A: Add Vitest** (Recommended - fast, Vite-native)
```bash
cd packages/vite-plugin-paraglide-editor
pnpm add -D vitest
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

Create `tests/plugin.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { paraglideEditorPlugin } from '../src/index.js';

describe('paraglideEditorPlugin', () => {
  it('should return a valid Vite plugin', () => {
    const plugin = paraglideEditorPlugin();

    expect(plugin).toHaveProperty('name', 'paraglide-editor');
    expect(plugin).toHaveProperty('enforce', 'post');
    expect(plugin).toHaveProperty('configResolved');
    expect(plugin).toHaveProperty('transform');
  });

  it('should respect editor mode flag', () => {
    const plugin = paraglideEditorPlugin();

    // Mock config
    const config = {
      env: { VITE_PARAGLIDE_EDITOR: 'false' }
    };

    plugin.configResolved(config);

    // Transform should return null when editor mode is off
    const result = plugin.transform('export const test = "value"', 'file.js');
    expect(result).toBeNull();
  });
});
```

**Option B: Document "No Tests Yet"**

Add to README.md:
```markdown
## Testing

⚠️ **Test coverage is currently in progress.** This is a pre-1.0 package.

To verify functionality, run the example projects:
- `pnpm --filter vanilla dev`
- `pnpm --filter react-router dev`
- `pnpm --filter sveltekit dev`
```

---

### 7. Missing JSDoc Documentation

**Problem**:
- Core plugin functions lack comprehensive JSDoc comments
- Runtime files have good purpose comments, but missing function-level docs
- Makes IDE autocomplete less useful
- Harder for contributors to understand

**Example** - `src/middleware.js:14`:
```javascript
export function createEditorMiddleware(viteConfig) {
  // Missing JSDoc
  return (req, res, next) => {
    // ...
  };
}
```

**Impact**: ⚠️ LOW
- Reduced DX (developer experience)
- Harder to contribute

**Recommendation**:
Add comprehensive JSDoc to all exported functions:

```javascript
/**
 * Creates middleware for serving Paraglide editor endpoints
 *
 * This middleware handles:
 * - `/@paraglide-editor/langs.json` - Serves raw translation JSON
 *
 * @param {Object} viteConfig - Resolved Vite configuration object
 * @param {string} viteConfig.root - Project root directory
 * @returns {Function} Express-style middleware function (req, res, next)
 *
 * @example
 * ```js
 * server.middlewares.use(createEditorMiddleware(viteConfig));
 * ```
 */
export function createEditorMiddleware(viteConfig) {
  return (req, res, next) => {
    // ...
  };
}
```

---

### 8. README Might Be Outdated

**Problem**:
- README mentions `<span data-i18n-key="...">` wrapping (line 12)
- Current implementation uses `data-paraglide-key` attribute (verified in runtime code)
- Documentation doesn't match implementation

**Current README (line 12)**:
```markdown
- 🔍 Wraps translation strings with `<span data-i18n-key="..." data-i18n-params="...">`
```

**Actual Implementation** (`src/runtime/overlay.js`):
```javascript
element.setAttribute('data-paraglide-key', key);
```

**Impact**: ⚠️ MEDIUM
- Users will look for wrong attributes
- Browser extension developers will be confused

**Recommendation**:

Update README.md line 12:
```markdown
- 🔍 Tracks translation strings in DOM with `data-paraglide-key` attributes
```

Update lines 84-86:
```html
<!-- Current (incorrect) -->
<h1 data-i18n-key="welcome">Welcome!</h1>

<!-- Correct -->
<h1 data-paraglide-key="welcome">Welcome!</h1>
```

Update line 90:
```javascript
// Current (incorrect)
document.querySelector('[data-i18n-key="welcome"]')

// Correct
document.querySelector('[data-paraglide-key="welcome"]')
```

---

### 9. No npm Scripts

**Problem**:
- `package.json` has NO scripts section
- No `prepublishOnly` script to prevent accidental publishing
- No `test` script
- No `lint` script

**Current**:
```json
{
  "name": "vite-plugin-paraglide-editor",
  // ... no "scripts" field at all
}
```

**Impact**: ⚠️ MEDIUM
- Cannot run tests via `npm test`
- No safety checks before publishing
- Doesn't follow npm conventions

**Recommendation**:
```json
{
  "scripts": {
    "test": "echo \"No tests yet. Run examples to verify.\" && exit 0",
    "prepublishOnly": "echo \"⚠️  Publishing vite-plugin-paraglide-editor@$npm_package_version\" && sleep 2",
    "lint": "echo \"No linter configured yet\" && exit 0"
  }
}
```

When tests are added:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "pnpm test",
    "lint": "eslint src/"
  }
}
```

---

### 10. No .npmignore

**Problem**:
- No `.npmignore` file to control what gets published
- Relies entirely on `files` field in `package.json`
- May accidentally publish unnecessary files

**Impact**: ⚠️ LOW
- `files` field is usually sufficient
- But `.npmignore` provides more control

**Recommendation**:

**Option A: Use `files` field only** (Current approach - simpler)
- Already have `files` field in `package.json`
- This is the modern, recommended approach
- No action needed

**Option B: Add `.npmignore` for more control**
```bash
cat > packages/vite-plugin-paraglide-editor/.npmignore << 'EOF'
# Development files
.gitignore
*.test.js
*.spec.js
tests/
coverage/

# Documentation (keep only README)
docs/
examples/

# Build artifacts
*.log
.DS_Store
EOF
```

**Recommendation**: Stick with `files` field (Option A). It's simpler and modern best practice.

---

### 11. Missing Type Exports Configuration

**Problem**:
- TypeScript definitions exist (`client.d.ts`)
- But `package.json` export types could be clearer
- Current config mixes default and types exports

**Current**:
```json
"exports": {
  ".": {
    "types": "./client.d.ts",
    "default": "./src/index.js"
  },
  "./client": {
    "types": "./client.d.ts"
  }
}
```

**Impact**: ⚠️ LOW
- Works but could be clearer
- Duplication between "." and "./client"

**Recommendation**:

**Option A: Simplify** (if "./client" import is not needed)
```json
"exports": {
  ".": {
    "types": "./client.d.ts",
    "default": "./src/index.js"
  }
}
```

Users import as:
```typescript
import { paraglideEditorPlugin } from 'vite-plugin-paraglide-editor';
import type { ParaglideEditor } from 'vite-plugin-paraglide-editor';
```

**Option B: Keep separate client types** (if "/client" import is intentional)
```json
"exports": {
  ".": {
    "types": "./client.d.ts",
    "default": "./src/index.js"
  },
  "./client": {
    "types": "./client.d.ts",
    "default": "./client.d.ts"
  }
}
```

Users import as:
```typescript
import { paraglideEditorPlugin } from 'vite-plugin-paraglide-editor';
import type { ParaglideEditor } from 'vite-plugin-paraglide-editor/client';
```

**Recommendation**: Use Option B (keep current structure) - it's clearer for type-only imports.

---

### 12. No Publishing Checklist Documentation

**Problem**:
- No documentation on how to publish the package
- No pre-publish checklist
- Risk of publishing incomplete/broken version

**Impact**: ⚠️ MEDIUM
- Easy to forget steps before publishing
- May publish broken version

**Recommendation**:

Create `packages/vite-plugin-paraglide-editor/PUBLISHING.md`:
```markdown
# Publishing Checklist

Before publishing `vite-plugin-paraglide-editor` to npm, complete this checklist:

## Pre-Publish Checklist

### 1. Version & Changelog
- [ ] Update version in `package.json` (follow semver)
- [ ] Update `CHANGELOG.md` with changes
- [ ] Commit version bump: `git commit -am "chore: bump version to X.Y.Z"`
- [ ] Tag release: `git tag vite-plugin-paraglide-editor@X.Y.Z`

### 2. Package Integrity
- [ ] Run `npm pack --dry-run` to see what will be published
- [ ] Verify `files` array includes all necessary files
- [ ] Check LICENSE file exists
- [ ] Verify `package.json` metadata (author, repo, bugs, homepage)

### 3. Testing
- [ ] Run example projects:
  - `pnpm --filter vanilla dev` (verify works)
  - `pnpm --filter react-router dev` (verify works)
  - `pnpm --filter sveltekit dev` (verify works)
- [ ] Test production builds:
  - `VITE_PARAGLIDE_EDITOR=true pnpm --filter vanilla build`
  - Verify editor mode works in preview
- [ ] Test with editor mode OFF:
  - `VITE_PARAGLIDE_EDITOR=false pnpm --filter vanilla build`
  - Verify no editor code injected

### 4. Documentation
- [ ] README.md is up to date
- [ ] API documentation matches implementation
- [ ] Examples in README work

### 5. Publish
```bash
cd packages/vite-plugin-paraglide-editor

# Dry run first
npm publish --dry-run

# Actually publish (requires npm login)
npm publish

# Or if scoped package
npm publish --access public
```

### 6. Post-Publish
- [ ] Push git tags: `git push --tags`
- [ ] Create GitHub release
- [ ] Announce on Twitter/Discord/etc
- [ ] Update root README with npm badge

## Emergency Unpublish

If you need to unpublish within 72 hours:
```bash
npm unpublish vite-plugin-paraglide-editor@X.Y.Z
```

Note: npm allows unpublishing only within 72 hours and if no other packages depend on it.
```

---

## Summary of Issues

| # | Issue | Severity | Blocks Publishing? |
|---|-------|----------|-------------------|
| 1 | Missing LICENSE file | HIGH | ⚠️ Should fix |
| 2 | Invalid `files` field | MEDIUM | ⚠️ Should fix |
| 3 | Missing package metadata | MEDIUM | ❌ No |
| 4 | Missing .gitignore | LOW | ❌ No |
| 5 | No CHANGELOG | MEDIUM | ❌ No |
| 6 | No tests | HIGH | ⚠️ Risky |
| 7 | Missing JSDoc | LOW | ❌ No |
| 8 | README outdated | MEDIUM | ⚠️ Should fix |
| 9 | No npm scripts | MEDIUM | ❌ No |
| 10 | No .npmignore | LOW | ❌ No |
| 11 | Type exports unclear | LOW | ❌ No |
| 12 | No publish checklist | MEDIUM | ❌ No |

**Critical Path to Publishing**:
1. ✅ MUST: Add LICENSE file
2. ✅ MUST: Fix `files` field (remove non-existent runtime.js)
3. ✅ MUST: Update README (data-paraglide-key)
4. ✅ SHOULD: Add package metadata (author, repo, etc)
5. ✅ SHOULD: Add CHANGELOG.md
6. ⚠️ OPTIONAL: Add tests (or document lack of tests)

---

## Quick Fix Script

Here's a script to fix the most critical issues:

```bash
#!/bin/bash
# fix-plugin-package.sh

cd packages/vite-plugin-paraglide-editor

echo "🔧 Fixing vite-plugin-paraglide-editor package..."

# 1. Add LICENSE
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# 2. Add .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
coverage/
.DS_Store
*.log
*.tmp
EOF

# 3. Add CHANGELOG
cat > CHANGELOG.md << 'EOF'
# Changelog

## [Unreleased]

## [0.1.0] - 2025-12-03
- Initial release
EOF

# 4. Update package.json (manual step required)
echo ""
echo "✅ Created LICENSE, .gitignore, CHANGELOG.md"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "1. Update package.json:"
echo "   - Fix 'files' field (remove 'runtime.js', add 'LICENSE')"
echo "   - Add 'author' field"
echo "   - Add 'repository' field"
echo "   - Add 'homepage' field"
echo "   - Add 'bugs' field"
echo "   - Add 'scripts' section"
echo ""
echo "2. Update README.md:"
echo "   - Change 'data-i18n-key' to 'data-paraglide-key'"
echo ""
echo "3. Run: npm pack --dry-run"
echo "   - Verify package contents"
```

---

## Recommended Next Steps

### Phase 1: Pre-Publish Essentials (Required)
1. ✅ Run the quick fix script above
2. ✅ Manually update `package.json` (see Issue #2, #3, #9)
3. ✅ Update README attribute names (see Issue #8)
4. ✅ Test with `npm pack --dry-run`

### Phase 2: Quality Improvements (Recommended)
5. Add basic tests with Vitest
6. Add JSDoc to all exports
7. Create PUBLISHING.md checklist

### Phase 3: Polish (Nice to Have)
8. Set up ESLint
9. Add CI/CD for automated testing
10. Create contribution guidelines

---

## Estimated Time to Fix

- **Critical issues** (1-3, 8): ~30 minutes
- **Quality improvements** (5, 6, 7, 9): ~2 hours
- **Polish** (4, 10, 11, 12): ~1 hour

**Total to publishable state**: ~30 minutes
**Total to production-ready**: ~3.5 hours

---

## Verification Commands

After fixes:
```bash
# Check package contents
npm pack --dry-run

# Verify file list
ls -la packages/vite-plugin-paraglide-editor/

# Test in example
cd examples/vanilla
rm -rf node_modules/.vite
pnpm dev
```

---

**Next Action**: Review this document, then run the quick fix script and update package.json manually.
