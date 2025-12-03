# Publishing Checklist

This document provides a comprehensive checklist for publishing `vite-plugin-paraglide-debug` to npm.

## Pre-Publish Checklist

### 1. Version & Changelog

- [ ] Decide on new version number (follow [Semantic Versioning](https://semver.org/))
  - **Patch** (0.1.x): Bug fixes, no breaking changes
  - **Minor** (0.x.0): New features, no breaking changes
  - **Major** (x.0.0): Breaking changes
- [ ] Update `version` in `package.json`
- [ ] Update `CHANGELOG.md` with all changes:
  - Move items from `[Unreleased]` to new version section
  - Add release date
  - Categorize changes: Added, Changed, Deprecated, Removed, Fixed, Security
- [ ] Commit version bump:
  ```bash
  git add package.json CHANGELOG.md
  git commit -m "chore(plugin): bump version to X.Y.Z"
  ```
- [ ] Create git tag:
  ```bash
  git tag vite-plugin-paraglide-debug@X.Y.Z
  ```

### 2. Package Integrity

- [ ] Verify package contents:
  ```bash
  cd packages/vite-plugin-paraglide-debug
  npm pack --dry-run
  ```
- [ ] Check that `files` array includes all necessary files:
  - ✅ `src/` directory
  - ✅ `client.d.ts` (TypeScript definitions)
  - ✅ `LICENSE` file
  - ✅ `CHANGELOG.md`
  - ✅ `README.md` (auto-included)
  - ✅ `package.json` (auto-included)
- [ ] Verify `LICENSE` file exists and has correct copyright year
- [ ] Verify `package.json` metadata is complete:
  - ✅ `author` field filled in
  - ✅ `repository` URL correct
  - ✅ `homepage` URL correct
  - ✅ `bugs` URL correct
  - ✅ `keywords` are descriptive

### 3. Testing

#### Example Projects
- [ ] Test vanilla example:
  ```bash
  cd examples/vanilla
  rm -rf node_modules/.vite
  VITE_PARAGLIDE_BROWSER_DEBUG=true pnpm dev
  ```
  - Open http://localhost:3210
  - Verify floating button appears
  - Verify translations can be edited
  - Check console for errors

- [ ] Test React Router example:
  ```bash
  cd examples/react-router
  rm -rf node_modules/.vite
  VITE_PARAGLIDE_BROWSER_DEBUG=true pnpm dev
  ```
  - Open http://localhost:3220
  - Verify debug mode works
  - Test navigation between routes

- [ ] Test SvelteKit example:
  ```bash
  cd examples/sveltekit
  rm -rf node_modules/.vite
  VITE_PARAGLIDE_BROWSER_DEBUG=true pnpm dev
  ```
  - Open http://localhost:3230
  - Verify SSR + debug mode works
  - Check Network tab for `/@paraglide-debug/` requests

#### Production Builds
- [ ] Test production build with debug mode ON:
  ```bash
  cd examples/vanilla
  VITE_PARAGLIDE_BROWSER_DEBUG=true pnpm build
  pnpm preview
  ```
  - Verify debug functionality works in production build
  - Check that runtime script is included

- [ ] Test production build with debug mode OFF:
  ```bash
  cd examples/vanilla
  VITE_PARAGLIDE_BROWSER_DEBUG=false pnpm build
  pnpm preview
  ```
  - Verify NO debug code is injected
  - Check that `window.__paraglideBrowserDebug` is undefined
  - Verify no `/@paraglide-debug/` network requests

#### Browser Extension Testing
- [ ] Verify TypeScript types are accessible:
  ```typescript
  import type { ParaglideBrowserDebug } from 'vite-plugin-paraglide-debug/client';
  ```
- [ ] Test `window.__paraglideBrowserDebug` API in browser console:
  ```javascript
  window.__paraglideBrowserDebug.registry // Should be Map
  window.__paraglideBrowserDebug.getElements() // Should return array
  window.__paraglideBrowserDebug.refresh() // Should re-scan DOM
  ```

### 4. Documentation

- [ ] `README.md` is up to date:
  - Installation instructions work
  - Configuration examples are correct
  - API documentation matches implementation
  - All code examples are tested
  - Attribute names are correct (`data-paraglide-key`, not `data-i18n-key`)
- [ ] `CHANGELOG.md` is up to date
- [ ] TypeScript definitions in `client.d.ts` match runtime API
- [ ] JSDoc comments are present on all exported functions

### 5. Code Quality

- [ ] No TODO or FIXME comments in code
- [ ] No console.log statements (except intentional debug output)
- [ ] No commented-out code
- [ ] All imports are used
- [ ] No unused variables

### 6. Security

- [ ] No hardcoded credentials or secrets
- [ ] No sensitive file paths exposed
- [ ] Dependencies are up to date (check for vulnerabilities):
  ```bash
  pnpm audit
  ```

## Publishing Process

### Option A: Publish from Local Machine

1. **Login to npm** (if not already logged in):
   ```bash
   npm login
   ```

2. **Dry run** to verify package contents:
   ```bash
   cd packages/vite-plugin-paraglide-debug
   npm pack --dry-run
   ```

3. **Publish** to npm:
   ```bash
   npm publish
   # Or if scoped package (@yourorg/vite-plugin-paraglide-debug):
   npm publish --access public
   ```

4. **Verify** on npm:
   - Visit https://www.npmjs.com/package/vite-plugin-paraglide-debug
   - Check that README displays correctly
   - Verify version number is correct

### Option B: Publish via CI/CD (Recommended for Teams)

1. **Create GitHub release**:
   - Go to repository > Releases > New Release
   - Tag: `vite-plugin-paraglide-debug@X.Y.Z`
   - Title: `vite-plugin-paraglide-debug v.X.Y.Z`
   - Copy CHANGELOG entries to release notes

2. **Automated publish**:
   - CI/CD workflow (GitHub Actions) will publish to npm
   - Monitor workflow for errors

## Post-Publish Checklist

### 1. Git & GitHub

- [ ] Push commits and tags:
  ```bash
  git push origin main
  git push --tags
  ```

- [ ] Create GitHub release:
  - Tag: `vite-plugin-paraglide-debug@X.Y.Z`
  - Title: `vite-plugin-paraglide-debug vX.Y.Z`
  - Description: Copy from CHANGELOG.md
  - Attach built package (optional)

### 2. Verification

- [ ] Install published package in a test project:
  ```bash
  mkdir test-install
  cd test-install
  npm init -y
  npm install vite-plugin-paraglide-debug
  ```

- [ ] Verify package.json exports work:
  ```bash
  node -e "console.log(require('vite-plugin-paraglide-debug/package.json').version)"
  ```

- [ ] Check npm package page:
  - Visit https://www.npmjs.com/package/vite-plugin-paraglide-debug
  - README renders correctly
  - Links work
  - Version is correct
  - Download count starts incrementing

### 3. Update Root README

- [ ] Add npm badge to root `README.md`:
  ```markdown
  [![npm version](https://badge.fury.io/js/vite-plugin-paraglide-debug.svg)](https://www.npmjs.com/package/vite-plugin-paraglide-debug)
  [![npm downloads](https://img.shields.io/npm/dm/vite-plugin-paraglide-debug.svg)](https://www.npmjs.com/package/vite-plugin-paraglide-debug)
  ```

- [ ] Update installation instructions in root README
- [ ] Mark examples as using published version (if applicable)

### 4. Communication

- [ ] Announce release (choose platforms):
  - [ ] Twitter/X
  - [ ] Discord server
  - [ ] Reddit (r/javascript, r/webdev)
  - [ ] Dev.to blog post
  - [ ] Company/project blog
  - [ ] Inlang community

- [ ] Update any related documentation sites

### 5. Monitoring

- [ ] Watch npm package for first week:
  - Download statistics
  - Issues reported
  - Questions on npm/GitHub

- [ ] Respond to issues and PRs promptly

## Rollback / Emergency Procedures

### If Package Has Critical Bug

**Within 72 hours of publishing:**

You can unpublish:
```bash
npm unpublish vite-plugin-paraglide-debug@X.Y.Z
```

⚠️ **Warning**: Only works if:
- Published less than 72 hours ago
- No other packages depend on it
- You have permission

**After 72 hours:**

Cannot unpublish. Instead:

1. **Publish patch version** with fix
2. **Deprecate broken version**:
   ```bash
   npm deprecate vite-plugin-paraglide-debug@X.Y.Z "Critical bug, use vX.Y.Z+1 instead"
   ```

### If Wrong Version Published

1. **Don't panic** - version numbers can't be reused
2. **Publish new version** with correct changes
3. **Deprecate wrong version**:
   ```bash
   npm deprecate vite-plugin-paraglide-debug@X.Y.Z "Incorrect version, use vX.Y.Z+1"
   ```

## Tips for Successful Publishing

### Before First Publish
- Start with `0.1.0` version
- Mark as "beta" or "alpha" in README if not production-ready
- Set expectations in README about stability

### Version Strategy
- Use `0.x.x` versions until API is stable
- Jump to `1.0.0` when ready for production use
- Follow semantic versioning strictly after 1.0.0

### Common Mistakes to Avoid
- ❌ Publishing with debug console.logs
- ❌ Forgetting to update CHANGELOG
- ❌ Wrong version in package.json
- ❌ Missing LICENSE file
- ❌ Broken links in README
- ❌ Outdated peer dependencies
- ❌ Publishing with uncommitted changes

### Best Practices
- ✅ Test in fresh directory (not symlinked)
- ✅ Use `npm pack` to inspect contents
- ✅ Keep CHANGELOG up to date
- ✅ Write clear commit messages
- ✅ Tag releases in git
- ✅ Respond to issues within 24-48 hours
- ✅ Have rollback plan ready

## Quick Reference Commands

```bash
# Check what will be published
npm pack --dry-run

# Publish to npm
npm publish

# Publish scoped package publicly
npm publish --access public

# Deprecate a version
npm deprecate vite-plugin-paraglide-debug@X.Y.Z "Reason here"

# Unpublish (within 72 hours)
npm unpublish vite-plugin-paraglide-debug@X.Y.Z

# Check package info
npm info vite-plugin-paraglide-debug

# View all versions
npm info vite-plugin-paraglide-debug versions
```

---

**Last Updated**: 2025-12-03
**Next Review**: Before first publish
