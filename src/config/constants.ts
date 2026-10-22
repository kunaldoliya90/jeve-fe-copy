/** Values shared across features. Anything feature-specific belongs in that feature. */

/** localStorage / sessionStorage keys, namespaced to avoid collisions. */
export const STORAGE_KEYS = {
  accessToken: 'jeve.auth.access-token',
  theme: 'jeve.ui.theme',
  sidebarCollapsed: 'jeve.ui.sidebar-collapsed',
} as const;

/** Default page size for paginated lists. */
export const DEFAULT_PAGE_SIZE = 25;

/** Debounce applied to search-as-you-type inputs, in milliseconds. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Tailwind's breakpoints, mirrored for use in `useMediaQuery`. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
