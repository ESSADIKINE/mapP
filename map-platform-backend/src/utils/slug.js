/**
 * Slugify a string for filenames.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}
