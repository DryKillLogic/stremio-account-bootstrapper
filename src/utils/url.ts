export const isValidManifestUrl = (url: string): boolean => {
  if (!url) return false;
  const exp =
    /^https:\/\/([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?::\d+)?(?:\/(?:[^\/\s]+))*\/manifest\.json$/i;
  return exp.test(url.trim());
};
