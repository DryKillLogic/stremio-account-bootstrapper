![logo](https://github.com/DryKillLogic/stremio-account-bootstrapper/blob/main/public/logo.png?raw=true)

# Stremio Account Bootstrapper

Stremio Account Bootstrapper lets you set up your Stremio account with just a few clicks by bootstrapping a preset into your account. It's handy for newcomers, those who want a solid foundation to build their setup on, or to speed up the process of setting up new accounts for family members or friends.

**WARNING: You will wipe the existing setup. Recommended to backup your current configuration before proceeding. Use it at your own risk. No support is provided.**

## Features

- Automated process of setting up an account in a couple of minutes.
- Option to select different presets: minimal, standard, full, kids, and factory.
- Option to set the preset to different languages: English (US), Spanish (MX), Spanish (ES), Portuguese (BR), French (FR), Italian (IT), German (DE), and Dutch (NL) are currently supported.
- Backup your current configuration or restore it.
- Better multilanguage support in Stremio.
- TMDB is the default metadata resolver. Cinemeta catalogs were removed without breaking any core functionality.
- RealDebrid, AllDebrid, Premiumize, Debrid-Link, EasyDebrid, and TorBox support.
- RPDB support.
- Ability to reset the account to a default state (factory preset).
- Optimized addons configuration.
- Sort addons and rename/delete catalogs (inherited from Addon Manager).

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur)

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Format code with Prettier

```sh
npm run format
```

## Credits

This tool is based on the original pancake3000 work and redd-ravenn fork, with the collaboration of Sleeyax and &#60;Code/&#62;. This idea couldn't have come to fruition without their contribution to the Stremio community 🙏.
