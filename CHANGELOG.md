# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.1.2](https://github.com/DryKillLogic/stremio-account-bootstrapper/compare/v2.1.1...v2.1.2) (2026-02-27)

### Bug Fixes

- Replaced the tooltip component with floating-vue to resolve mobile layout issues ([7ffacb4](https://github.com/DryKillLogic/stremio-account-bootstrapper/commit/7ffacb4c3c217a4e809827d5913b3f72ee1a4811))

### [2.1.1](https://github.com/DryKillLogic/stremio-account-bootstrapper/compare/v2.1.0...v2.1.1) (2026-02-26)

### Bug Fixes

- fixed Debrid-Link key validation ([6de359b](https://github.com/DryKillLogic/stremio-account-bootstrapper/commit/6de359be7fc6c61511dd349434be64271a071c43))

## [2.1.0](https://github.com/DryKillLogic/stremio-account-bootstrapper/compare/v1.9.9...v2.1.0) (2026-02-26)

### Features

- add automated versioning and release management ([825b596](https://github.com/DryKillLogic/stremio-account-bootstrapper/commit/825b596a4e6ffa53475737c2a7021f82fc26d35b))
- Added Meteor addon ([5dee599](https://github.com/DryKillLogic/stremio-account-bootstrapper/commit/5dee599925861a99fdc8fea8b7d74023d4027f94))

## [2.0.0](https://github.com/DryKillLogic/stremio-account-bootstrapper/compare/v1.9.9...v2.0.0) (2026-02-23)

### Features

- **Complete Vue 3 Redesign**: Modern UI built with Vue 3, TypeScript, and Vite
- **Automated Versioning**: Add automated version management with conventional commits and changelog generation ([825b596](https://github.com/DryKillLogic/stremio-account-bootstrapper/commit/825b596a4e6ffa53475737c2a7021f82fc26d35b))
- **Multi-Debrid Support**: Support for multiple debrid services simultaneously
- **Portuguese (Portugal)**: Added pt-PT language support
- **Region-Specific Addons**: Added Cometa, CometFR, Brazuca Torrents, and NoTorrent addons
- **All-in-One Preset**: New preset featuring AIOStreams with Tam-Taro's template as the only configured streams addon
- **Advanced Options**: Replaced standalone RPDB step with comprehensive advanced options section
- **TMDB API Key Support**: Added ability to enter custom TMDB API key
- **AIOStreams Integration**: Added AIOStreams to the available addons list
- **AIOMetadata**: Switched to AIOMetadata as the primary metadata resolver and catalogs manager
- **Enhanced Catalogs**:
  - Switched "Trending" catalogs to TMDB default ones
  - Added "Top rated", Crunchyroll, and Netflix Kids catalogs (hidden by default)
  - Added superhero and decade-based movie collection catalogs (hidden by default)
  - Minor adjustments to "Latest Shows" catalog
- **Detailed Descriptions**: Added comprehensive descriptions for presets and configuration options
- **Version Display**: Version number now displayed in footer with link to changelog

### Improvements

- **Modular Addon Architecture**: Extracted addon logic into dedicated service components
- **Updated Instances**:
  - Switched Sootio instance to Midnight's
  - Switched Comet instance to G0ldys'
- **Addon Configurations**:
  - Fixed Peerflix addon config
  - Fixed es-ES Torrentio addon config
  - Updated Webstreamr addon config

### Technical

Built with Vue 3, TypeScript, Vite, Tailwind CSS, and DaisyUI with full i18n support.
