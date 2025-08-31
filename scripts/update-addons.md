# Addons Updater Script

This Node.js script automatically checks and updates addon manifests in JSON files by comparing local versions with remote versions.

---

## Features

*   Reads multiple JSON files containing addon data.
*   Checks each addon for updates via its `transportUrl`.
*   Updates local addon manifests if a newer version is found.
*   Skips addons without a `transportUrl`.
*   Ignores connection errors from local servers (e.g., Stremio local files).
*   Creates timestamped backups for any updated JSON files.
*   Provides color-coded console logs for easy status tracking.

---

## Supported Files

The script updates the files contained in the list:

`.scripts/update-addons-list.json`

You can modify it to add or remove files to upate.

---

## Prerequisites

At the project root install the proeject dependencies by running:

```
npm install
```

---

## Usage

To run the script, run the below command:

```
node ./scripts/update-addons.js
```
Only the version numbers of the addons will be updated in the original files. The copy with the date will have the full updated content.

You can use a comparison tool like `diff` or `meld` to review the changes made between the original and updated files.