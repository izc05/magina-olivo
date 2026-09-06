export type HomeSectionKey = 'market' | 'weather' | 'news' | 'cooperatives' | 'field' | 'olive';
export type HomePreference = { key: HomeSectionKey; enabled: boolean };
export const HOME_PREFERENCES_KEY = 'magina-home-preferences-v1';
export const DEFAULT_HOME_PREFERENCES: HomePreference[] = [
  { key: 'market', enabled: true }, { key: 'weather', enabled: true }, { key: 'news', enabled: true },
  { key: 'cooperatives', enabled: true }, { key: 'field', enabled: true }, { key: 'olive', enabled: true },
];
export function readHomePreferences(): HomePreference[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HOME_PREFERENCES_KEY) || 'null') as HomePreference[] | null;
    if (!Array.isArray(parsed)) return DEFAULT_HOME_PREFERENCES;
    const known = new Map(parsed.map((item) => [item.key, item.enabled]));
    return DEFAULT_HOME_PREFERENCES.map((item) => ({ ...item, enabled: known.get(item.key) ?? item.enabled }));
  } catch { return DEFAULT_HOME_PREFERENCES; }
}
