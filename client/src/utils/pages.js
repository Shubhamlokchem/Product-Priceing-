// Pages that can be given to a 'user' account (Create / Manage IDs is always admin-only)
export const USER_PAGES = [
 { key: 'dashboard', label: 'Dashboard' },
 { key: 'products', label: 'Manage Products' },
 { key: 'history', label: 'Price History' },
 { key: 'compare', label: 'Compare Prices' },
 { key: 'queries', label: 'Queries' },
];
// Accounts created before page access existed keep their old set
export const DEFAULT_USER_PAGES = ['dashboard', 'products', 'queries'];
export const pagesOf = u => (Array.isArray(u?.pages) ? u.pages : DEFAULT_USER_PAGES);
