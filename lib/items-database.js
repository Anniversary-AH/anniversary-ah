// Anniversary Realm Essential Items Database
// This is our curated list of items that Anniversary realm players actually search for

export const ANNIVERSARY_ITEMS = {
  // Consumables - Most searched
  19007: { // Black Lotus
    name: 'Black Lotus',
    quality: 'epic',
    category: 'herb',
    popular: true
  },
  13461: { // Greater Fire Protection Potion  
    name: 'Greater Fire Protection Potion',
    quality: 'uncommon',
    category: 'consumable',
    popular: true
  },
  9206: { // Elixir of the Mongoose
    name: 'Elixir of the Mongoose', 
    quality: 'uncommon',
    category: 'consumable',
    popular: true
  },
  13457: { // Greater Nature Protection Potion
    name: 'Greater Nature Protection Potion',
    quality: 'uncommon', 
    category: 'consumable',
    popular: false
  },
  
  // Materials - High value
  12359: { // Thorium Bar
    name: 'Thorium Bar',
    quality: 'common',
    category: 'metal',
    popular: true
  },
  12810: { // Enchanted Leather
    name: 'Enchanted Leather',
    quality: 'uncommon',
    category: 'leather',
    popular: false
  },
  14342: { // Mooncloth
    name: 'Mooncloth',
    quality: 'epic',
    category: 'cloth',
    popular: true
  },
  
  // Bags - Always in demand
  14156: { // Bottomless Bag
    name: 'Bottomless Bag',
    quality: 'rare',
    category: 'bag',
    popular: true
  },
  
  // Rare Items - Big ticket
  11815: { // Hand of Justice
    name: 'Hand of Justice', 
    quality: 'epic',
    category: 'trinket',
    popular: false
  },
  16984: { // Lightforge Bracers
    name: 'Lightforge Bracers',
    quality: 'uncommon',
    category: 'armor',
    popular: false
  }
};

// Get popular items for quick search buttons
export function getPopularItems() {
  return Object.entries(ANNIVERSARY_ITEMS)
    .filter(([id, item]) => item.popular)
    .map(([id, item]) => ({ id: parseInt(id), ...item }));
}

// Search items by name
export function searchItemsByName(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  const term = searchTerm.toLowerCase();
  return Object.entries(ANNIVERSARY_ITEMS)
    .filter(([id, item]) => item.name.toLowerCase().includes(term))
    .map(([id, item]) => ({ id: parseInt(id), ...item }))
    .slice(0, 10); // Limit to 10 results
}

// Get item by ID
export function getItemById(itemId) {
  return ANNIVERSARY_ITEMS[itemId] || null;
}

// Anniversary realm server mapping
export const ANNIVERSARY_SERVERS = {
  'dreamscythe': { name: 'Dreamscythe', type: 'Normal', region: 'US' },
  'nightslayer': { name: 'Nightslayer', type: 'PvP', region: 'US' },
  'doomhowl': { name: 'Doomhowl', type: 'Hardcore', region: 'US' },
  'thunderstrike': { name: 'Thunderstrike', type: 'Normal', region: 'EU' },
  'spineshatter': { name: 'Spineshatter', type: 'PvP', region: 'EU' },
  'soulseeker': { name: 'Soulseeker', type: 'Hardcore', region: 'EU' },
  'maladath': { name: 'Maladath', type: 'PvP', region: 'Oceanic' }
};
