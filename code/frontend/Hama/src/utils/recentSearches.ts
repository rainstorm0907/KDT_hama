const RECENT_SEARCHES_KEY = 'hama_recent_searches';
const MAX_RECENT_SEARCHES = 8;

export function getRecentSearches() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery || typeof window === 'undefined') {
    return [];
  }

  const nextSearches = [
    trimmedQuery,
    ...getRecentSearches().filter((item) => item !== trimmedQuery),
  ].slice(0, MAX_RECENT_SEARCHES);

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextSearches));

  return nextSearches;
}

export function removeRecentSearch(query: string) {
  if (typeof window === 'undefined') {
    return [];
  }

  const nextSearches = getRecentSearches().filter((item) => item !== query);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextSearches));

  return nextSearches;
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') {
    return [];
  }

  window.localStorage.removeItem(RECENT_SEARCHES_KEY);

  return [];
}
