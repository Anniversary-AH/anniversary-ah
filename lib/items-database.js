// lib/items-database.js
// WoW Classic items database for Anniversary realms

/**
 * Classic WoW Item Database
 */
export const CLASSIC_ITEMS = {
  'Greater Fire Protection Potion': {
    id: 13457,
    quality: 'uncommon',
    icon: 'inv_potion_24',
    category: 'consumable'
  },
  'Greater Frost Protection Potion': {
    id: 13456,
    quality: 'uncommon', 
    icon: 'inv_potion_20',
    category: 'consumable'
  },
  'Greater Nature Protection Potion': {
    id: 13458,
    quality: 'uncommon',
    icon: 'inv_potion_22',
    category: 'consumable'
  },
  'Elixir of the Mongoose': {
    id: 13452,
    quality: 'uncommon',
    icon: 'inv_potion_32',
    category: 'consumable'
  },
  'Black Lotus': {
    id: 13468,
    quality: 'epic',
    icon: 'inv_misc_herb_blacklotus',
    category: 'trade_goods'
  },
  'Arcanite Bar': {
    id: 12360,
    quality: 'uncommon',
    icon: 'inv_ingot_08',
    category: 'trade_goods'
  },
  'Mooncloth Bag': {
    id: 14155,
    quality: 'rare',
    icon: 'inv_misc_bag_10',
    category: 'container'
  },
  'Flask of the Titans': {
    id: 13510,
    quality: 'epic',
    icon: 'inv_potion_62',
    category: 'consumable'
  },
  'Arcane Crystal': {
    id: 12363,
    quality: 'uncommon',
    icon: 'inv_misc_gem_crystal_02',
    category: 'trade_goods'
  }
};

/**
 * Get item info by name
 */
export function getItemByName(itemName) {
  const normalizedName = itemName.toLowerCase();
  
  for (const [name, item] of Object.entries(CLASSIC_ITEMS)) {
    if (name.toLowerCase() === normalizedName) {
      return { name, ...item };
    }
  }
  
  return null;
}

/**
 * Search items by partial name match
 */
export function searchItems(searchTerm) {
  const normalizedSearch = searchTerm.toLowerCase();
  const matches = [];
  
  for (const [name, item] of Object.entries(CLASSIC_ITEMS)) {
    if (name.toLowerCase().includes(normalizedSearch)) {
      matches.push({ name, ...item });
    }
  }
  
  return matches;
}

/**
 * Get fallback item data for unknown items
 */
export function getFallbackItemData(itemName) {
  return {
    name: itemName,
    quality: 'common',
    icon: 'inv_misc_questionmark',
    category: 'unknown'
  };
}
