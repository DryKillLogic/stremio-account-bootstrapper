import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the list of files from "update-addons-list.json"
const updateListPath = path.join(__dirname, 'update-addons-list.json');
let filesToUpdate = [];

try {
    const fileContent = fs.readFileSync(updateListPath, 'utf-8');
    const fileList = JSON.parse(fileContent);

    // If each item is an object with {file, enabled}, filter disabled files
    filesToUpdate = fileList
        .filter(item => {
            if (typeof item === 'string') return true;          // simple string
            if (item.enabled === undefined) return true;       // object without enabled
            return item.enabled;                               // object with enabled: true
        })
        .map(item => (typeof item === 'string' ? item : item.file))
        .map(file => path.join(__dirname, file));
} catch (error) {
    console.error(chalk.red(`Failed to read update-addons-list.json: ${error.message}`));
    process.exit(1);
}

// Function to update version in JSON string while preserving formatting
function updateVersionInJsonString(jsonString, transportUrl, newVersion) {
    // Find the addon section by transportUrl
    const transportUrlIndex = jsonString.indexOf(`"transportUrl": "${transportUrl}"`);
    if (transportUrlIndex === -1) return jsonString;

    // Find the start of this addon object
    let addonStart = jsonString.lastIndexOf('{', transportUrlIndex);
    if (addonStart === -1) return jsonString;

    // Find the end of this addon object
    let braceCount = 1;
    let addonEnd = transportUrlIndex + `"transportUrl": "${transportUrl}"`.length;
    while (braceCount > 0 && addonEnd < jsonString.length) {
        if (jsonString[addonEnd] === '{') braceCount++;
        if (jsonString[addonEnd] === '}') braceCount--;
        addonEnd++;
    }
    if (braceCount !== 0) return jsonString;

    // Extract the addon object
    const addonObject = jsonString.substring(addonStart, addonEnd);

    // Find the version field in this addon
    const versionRegex = /("version":\s*")([^"]*)(")/;
    const match = addonObject.match(versionRegex);
    if (!match) return jsonString;

    // Replace only the version value
    const oldVersion = match[2];
    if (oldVersion === newVersion) return jsonString;

    const updatedAddon = addonObject.replace(versionRegex, `$1${newVersion}$3`);
    return jsonString.substring(0, addonStart) + updatedAddon + jsonString.substring(addonEnd);
}

async function checkAndUpdateAddons(filePath) {
    console.log(chalk.yellow(`Updating file: ${filePath}`));

    let addonsData;
    let upToDate = true;

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        addonsData = JSON.parse(fileContent);
    } catch (error) {
        console.error(chalk.red(`Failed to parse JSON file ${filePath}:`, error.message));
        return;
    }

    // Read original file content to preserve formatting
    let originalFileContent = fs.readFileSync(filePath, 'utf-8');
    let updatedFileContent = originalFileContent;

    let addons = [];

    // Find addons in the data structure
    if (addonsData.result && addonsData.result.addons) {
        addons = addonsData.result.addons;
    } else if (addonsData.addons) {
        // Handle object structure
        if (Array.isArray(addonsData.addons)) {
            addons = addonsData.addons;
        } else {
            addons = Object.values(addonsData.addons);
        }
    } else {
        console.error(chalk.red(`Could not find addons in ${filePath}`));
        return;
    }

    // Process each addon
    for (let addon of addons) {
        if (!addon.transportUrl) {
            console.log(chalk.yellow(`Skipping ${addon.manifest?.name || 'addon with no name'} because it has no transportUrl.`));
            continue;
        }

        try {
            const response = await axios.get(addon.transportUrl);
            const remoteManifest = response.data;

            if (remoteManifest.version && remoteManifest.version !== addon.manifest?.version) {
                console.log(chalk.green(`Updating ${addon.manifest.name} from version ${addon.manifest.version} to ${remoteManifest.version}`));
                
                // Update version in the file content while preserving formatting
                updatedFileContent = updateVersionInJsonString(updatedFileContent, addon.transportUrl, remoteManifest.version);
                
                upToDate = false;
            } else {
                console.log(chalk.blue(`${addon.manifest?.name || 'Unknown addon'}`) + " is up to date in " + chalk.yellow(`${path.basename(filePath)}`));
            }
        } catch (error) {
            if (error.message.includes('connect ECONNREFUSED 127.0.0.1:11470')) {
                // Ignore error from stremio local files
                continue;
            }
            console.error(chalk.red(`Failed to fetch manifest for ${addon.manifest?.name || addon.transportUrl}:`, error.message));
        }
    }

    if (!upToDate) {
        const date = new Date().toLocaleDateString('en-CA').replace(/-/g, '.');
        const backupFilePath = path.join(path.dirname(filePath), `${path.basename(filePath, '.json')}-${date}.json`);
        
        // Save backup with reformatted JSON for better readability
        fs.writeFileSync(backupFilePath, JSON.stringify(addonsData, null, 2));
        
        // Write updated data with preserved formatting
        fs.writeFileSync(filePath, updatedFileContent);
        console.log('Addons updated successfully. Backup saved as ' + chalk.green(`${path.basename(backupFilePath)}`));
    }
}

filesToUpdate.forEach(filePath => {
    checkAndUpdateAddons(filePath);
});