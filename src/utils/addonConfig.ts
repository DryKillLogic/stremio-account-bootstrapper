export function replaceAddonKey(
  config: any,
  oldKey: string,
  newEntries: Record<string, any>
) {
  const entries = Object.entries(config);
  const newConfig: any = {};

  for (const [key, value] of entries) {
    if (key === oldKey) {
      Object.assign(newConfig, newEntries);
    } else {
      newConfig[key] = value;
    }
  }

  return newConfig;
}
