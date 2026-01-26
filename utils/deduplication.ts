
/**
 * Global deduplication utility for list states
 * Ensures no duplicate items are rendered in lists
 */

/**
 * Removes duplicate items from a list based on a unique identifier
 * @param list - Array of items to deduplicate
 * @param idKey - Key to use for uniqueness (default: 'id')
 * @returns Deduplicated array
 */
export function dedupeById<T extends Record<string, any>>(
  list: T[],
  idKey: string = 'id'
): T[] {
  if (!list || list.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const deduplicated: T[] = [];

  for (const item of list) {
    const id = item[idKey];
    if (id && !seen.has(id)) {
      seen.add(id);
      deduplicated.push(item);
    }
  }

  console.log(`[Deduplication] Input: ${list.length}, Output: ${deduplicated.length}, Removed: ${list.length - deduplicated.length}`);
  
  return deduplicated;
}

/**
 * Sorts items by a date field in descending order (newest first)
 * @param list - Array of items to sort
 * @param dateKey - Key containing the date field (default: 'updatedAt')
 * @returns Sorted array
 */
export function sortByDateDesc<T extends Record<string, any>>(
  list: T[],
  dateKey: string = 'updatedAt'
): T[] {
  return [...list].sort((a, b) => {
    const dateA = new Date(a[dateKey]).getTime();
    const dateB = new Date(b[dateKey]).getTime();
    return dateB - dateA;
  });
}

/**
 * Combines deduplication and sorting for wishlist-like data
 * @param list - Array of items
 * @param idKey - Key for uniqueness
 * @param dateKey - Key for sorting
 * @returns Deduplicated and sorted array
 */
export function normalizeList<T extends Record<string, any>>(
  list: T[],
  idKey: string = 'id',
  dateKey: string = 'updatedAt'
): T[] {
  const deduped = dedupeById(list, idKey);
  return sortByDateDesc(deduped, dateKey);
}
