// Reads current src/locales/en.json and the last committed version (git HEAD).
// Finds keys that were added or whose English text changed, and updates other
// locale files accordingly. If --dry-run is passed, no files are modified.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dryRun = process.argv.includes('--dry-run');

const localesDir = path.join(__dirname, '..', 'src', 'locales');
const enPath = path.join(localesDir, 'en.json');

if (!fs.existsSync(enPath)) {
  console.error('en.json not found at', enPath);
  process.exit(1);
}

const currEn = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// try to read previous committed en.json from git HEAD
let prevEn = {};
try {
  const raw = execSync('git show HEAD:src/locales/en.json', {
    encoding: 'utf8'
  });
  prevEn = JSON.parse(raw);
} catch (err) {
  prevEn = {};
}

const addedKeys = Object.keys(currEn).filter((k) => !(k in prevEn));
const changedKeys = Object.keys(currEn).filter(
  (k) => k in prevEn && prevEn[k] !== currEn[k]
);
const removedKeys = Object.keys(prevEn).filter((k) => !(k in currEn));

if (
  addedKeys.length === 0 &&
  changedKeys.length === 0 &&
  removedKeys.length === 0
) {
  console.log('No added or changed keys detected in en.json compared to HEAD.');
  process.exit(0);
}

console.log('Added keys:', addedKeys);
console.log('Changed keys:', changedKeys, dryRun ? '(dry-run)' : '');
console.log('Removed keys:', removedKeys);

const localeFiles = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith('.json') && f !== 'en.json');

localeFiles.forEach((file) => {
  const filePath = path.join(localesDir, file);
  let locale;
  try {
    locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse', filePath, err.message);
    return;
  }

  const addedApplied = [];
  const changedApplied = [];
  const removedApplied = [];
  const skipped = [];

  // Apply added keys (always add missing keys)
  addedKeys.forEach((k) => {
    if (!(k in locale)) {
      locale[k] = currEn[k];
      addedApplied.push(k);
    }
  });

  // Apply changed keys
  changedKeys.forEach((k) => {
    const prevVal = prevEn[k];
    const currVal = currEn[k];
    const localeVal = locale[k];

    // if key is missing, add new English text
    if (!(k in locale)) {
      locale[k] = currVal;
      changedApplied.push(`${k} (added)`);
      return;
    }

    // If locale value looks like an untranslated placeholder (equals previous English
    // or "TODO: translate: <prev>") replace it with the new English text.
    // This prevents overwriting actual translations.
    if (
      localeVal === prevVal ||
      localeVal === `TODO: translate: ${prevVal}` ||
      localeVal === (prevVal || '').trim()
    ) {
      locale[k] = currVal;
      changedApplied.push(k);
      return;
    }

    // Otherwise the locale has a custom translation — skip and report
    skipped.push(k);
  });

  // Apply removed keys
  removedKeys.forEach((k) => {
    if (k in locale) {
      delete locale[k];
      removedApplied.push(k);
    }
  });

  if (addedApplied.length || changedApplied.length || removedApplied.length) {
    if (dryRun) {
      console.log(
        `${file}: (dry-run) +${addedApplied.length} would be added, +${changedApplied.length} would be updated, -${removedApplied.length} would be removed${skipped.length ? `, ${skipped.length} skipped` : ''}`
      );
      if (addedApplied.length)
        console.log('  would add:', addedApplied.join(', '));
      if (changedApplied.length)
        console.log('  would update:', changedApplied.join(', '));
      if (removedApplied.length)
        console.log('  would remove:', removedApplied.join(', '));
      if (skipped.length)
        console.log('  skipped (manual review required):', skipped.join(', '));
    } else {
      // write updated locale file (no backup file created)
      fs.writeFileSync(
        filePath,
        JSON.stringify(locale, null, 2) + '\n',
        'utf8'
      );
      console.log(
        `${file}: +${addedApplied.length} added, +${changedApplied.length} updated, -${removedApplied.length} removed${skipped.length ? `, ${skipped.length} skipped` : ''}`
      );
      if (addedApplied.length) console.log('  added:', addedApplied.join(', '));
      if (changedApplied.length)
        console.log('  updated:', changedApplied.join(', '));
      if (removedApplied.length)
        console.log('  removed:', removedApplied.join(', '));
      if (skipped.length)
        console.log('  skipped (manual review required):', skipped.join(', '));
    }
  } else {
    console.log(`${file}: no changes required`);
  }
});

console.log(
  `Locale update complete.${dryRun ? ' (dry-run, no files modified)' : ''}`
);
