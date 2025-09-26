export const convertToBytes = (gb: string | number) =>
  Number(gb) * 1024 * 1024 * 1024;

export const convertToMegabytes = (gb: string | number) => Number(gb) * 1024;
