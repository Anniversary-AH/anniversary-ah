// lib/blizzard-api.js
// Blizzard API helper functions for Anniversary realms

const BLIZZARD_API_BASE = 'https://us.api.blizzard.com';

/**
 * Get Blizzard API access token
 */
export async function getBlizzardAccessToken() {
  const response = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

/**
 * Get auction data for a connected realm
 */
export async function getAuctionData(connectedRealmId, namespace, accessToken) {
  const response = await fetch(
    `${BLIZZARD_API_BASE}/data/wow/connected-realm/${connectedRealmId}/auctions?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get auction data: ${response.status}`);
  }
  
  const data = await response.json();
  return data.auctions || [];
}

/**
 * Convert copper price to gold
 */
export function copperToGold(copper) {
  return Math.floor((copper || 0) / 10000);
}

/**
 * Format price for display
 */
export function formatPrice(copper) {
  const gold = copperToGold(copper);
  const silver = Math.floor(((copper || 0) % 10000) / 100);
  const copperRemaining = (copper || 0) % 100;
  
  if (gold > 0) {
    return `${gold}g ${silver}s ${copperRemaining}c`;
  } else if (silver > 0) {
    return `${silver}s ${copperRemaining}c`;
  } else {
    return `${copperRemaining}c`;
  }
}

/**
 * Search auctions for specific item by name
 */
export function searchAuctionsForItem(auctions, itemName) {
  if (!auctions || auctions.length === 0) {
    return [];
  }
  
  const searchTerm = itemName.toLowerCase();
  const matchingAuctions = [];
  
  for (const auction of auctions) {
    // Check if item has a name property and matches
    if (auction.item?.name && auction.item.name.toLowerCase().includes(searchTerm)) {
      matchingAuctions.push(auction);
    }
  }
  
  return matchingAuctions;
}

/**
 * Parse auction prices (Classic doesn't have faction data in auctions usually)
 */
export function parseAuctionPrices(itemAuctions) {
  if (!itemAuctions || itemAuctions.length === 0) {
    return { alliance: 0, horde: 0, error: 'No auctions found', count: 0 };
  }
  
  // Calculate minimum price from all auctions
  const prices = itemAuctions.map(auction => {
    const buyout = auction.buyout || auction.bid || 0;
    return copperToGold(buyout);
  }).filter(price => price > 0);
  
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  
  // Since Classic API doesn't reliably provide faction data in auctions,
  // we'll show the same price for both factions
  return {
    alliance: minPrice,
    horde: minPrice,
    count: itemAuctions.length,
    note: 'Cross-faction pricing (Anniversary realm feature)'
  };
}
