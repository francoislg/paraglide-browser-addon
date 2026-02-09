# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of editor metadata injection
- Runtime DOM element tracking with `data-paraglide-key` attributes
- TypeScript type definitions for browser API
- Browser extension API support via `window.__paraglideEditor`
- Multi-framework support (React, SvelteKit, Svelte, Vue, vanilla JS)
- Variant support (plural, ordinal, direct matching, multi-selector)
- Smart conflict detection for translation edits
- Export/import functionality for translations
- In-browser translation editing with live preview
- Language detection and switching
- IndexedDB storage for local edits
- Sync functionality with server translations
- Visual overlay mode for click-to-edit
- Floating button UI for quick access
- Modal interface for managing translations

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [0.1.0] - 2025-12-03

### Added
- Initial release
- Basic Vite plugin for Paraglide editor metadata injection
- Virtual module system for runtime code (`/@paraglide-editor/*`)
- Editor middleware for serving translations at `/@paraglide-editor/langs.json`
- HTML transformation hooks for automatic script injection
- Message function wrapping to track translation usage
- Registry system mapping translated text to metadata
- DOM scanning with TreeWalker to find translation elements
- MutationObserver for automatic re-scanning on DOM changes
