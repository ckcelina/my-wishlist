
/**
 * Deduplication utilities for preventing duplicate items in lists
 */

/**
 * Deduplicate an array of objects by a unique key
 * @param items - Array of items to deduplicate
 * @param key - The key to use for deduplication (e.g., 'id')
 * @returns Deduplicated array
 */
export function dedupeById<T extends Record<string, any>>(
  items: T[],
  key: keyof T = 'id'
): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  const seen = new Set<any>();
  const result: T[] = [];

  for (const item of items) {
    const value = item[key];
    if (value && !seen.has(value)) {
      seen.add(value);
      result.push(item);
    }
  }

  return result;
}

/**
 * Normalize a list by deduplicating and sorting
 * @param items - Array of items to normalize
 * @param idKey - The key to use for deduplication
 * @param sortKey - The key to use for sorting (optional)
 * @returns Normalized array
 */
export function normalizeList<T extends Record<string, any>>(
  items: T[],
  idKey: keyof T = 'id',
  sortKey?: keyof T
): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  // First deduplicate
  let result = dedupeById(items, idKey);

  // Then sort if sortKey is provided
  if (sortKey) {
    result = result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        return bVal.getTime() - aVal.getTime(); // Descending
      }

      // Handle strings (dates as strings)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDate = new Date(aVal);
        const bDate = new Date(bVal);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return bDate.getTime() - aDate.getTime(); // Descending
        }
        return aVal.localeCompare(bVal);
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return bVal - aVal; // Descending
      }

      return 0;
    });
  }

  return result;
}

/**
 * Remove duplicate items from an array while preserving order
 * @param items - Array of items
 * @returns Array with duplicates removed
 */
export function removeDuplicates<T>(items: T[]): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  return Array.from(new Set(items));
}

/**
 * Merge two arrays and remove duplicates by ID
 * @param existing - Existing array
 * @param incoming - New array to merge
 * @param idKey - The key to use for deduplication
 * @returns Merged and deduplicated array
 */
export function mergeAndDedupe<T extends Record<string, any>>(
  existing: T[],
  incoming: T[],
  idKey: keyof T = 'id'
): T[] {
  const merged = [...existing, ...incoming];
  return dedupeById(merged, idKey);
}
