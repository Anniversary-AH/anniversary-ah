import { searchItemsByName, getItemById } from '../../lib/items-database';

// Blizzard API integration
const BLIZZARD_API_BASE = 'https://us.api.blizzard.com';

// Get OAuth token
async function getBlizzardToken() {
  try {
    const credentials = Buffer.from(
      `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Token error: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Token Error:', error);
    return null;
  }
}

// Get server auction data
async function getServerAuctions(serverSlug, token) {
  try {
    // Anniversary realms connected realm IDs (these are the real IDs)
    const serverMapping = {
      'nightslayer': '4395',
      'dreamscythe': '4396', 
      'doomhowl': '4397',
      'thunderstrike': '4398', // EU
      'spineshatter': '4399',  // EU
      'soulseeker': '4400',    // EU
      'maladath': '4401'       // Oceanic
    };

    const connectedRealmId = serverMapping[serverSlug];
    if (!connectedRealmId) {
      throw new Error(`Unknown server: ${serverSlug}`);
    }

// Get server auction data
async function getServerAuctions(serverSlug, token) {
  try {
    console.log(`\n=== DEBUG: Getting auctions for ${serverSlug} ===`);
    
    // Anniversary realms connected realm IDs (these might be wrong)
    const serverMapping = {
      'nightslayer': '4395',
      'dreamscythe': '4396', 
      'doomhowl': '4397',
      'thunderstrike': '4398',
      'spineshatter': '4399',
      'soulseeker': '4400',
      'maladath': '4401'
    };

    const connectedRealmId = serverMapping[serverSlug];
    console.log(`Mapped ${serverSlug} to realm ID: ${connectedRealmId}`);
    
    if (!connectedRealmId) {
      throw new Error(`Unknown server: ${serverSlug}`);
    }

    // Try different namespaces - Anniversary realms might be different
    const namespaces = [
      'dynamic-classic1x-us',
      'dynamic-classic-us', 
      'dynamic-us',
      'dynamic-anniversary-us'
    ];
    
    const region = serverSlug.includes('eu') ? 'eu' : 'us';
    console.log(`Using region: ${region}`);
    
    for (const namespace of namespaces) {
      const auctionUrl = `https://${region}.api.blizzard.com/data/wow/connected-realm/${connectedRealmId}/auctions?namespace=${namespace}&locale=en_US&access_token=${token}`;
      console.log(`Trying URL: ${auctionUrl}`);
      
      const auctionResponse = await fetch(auctionUrl);
      console.log(`Response status: ${auctionResponse.status}`);
      
      if (auctionResponse.ok) {
        const auctionData = await auctionResponse.json();
        console.log(`SUCCESS! Got ${auctionData.auctions?.length || 0} auctions`);
        return auctionData.auctions || [];
      } else {
        const errorText = await auctionResponse.text();
        console.log(`Failed with namespace ${namespace}: ${auctionResponse.status} - ${errorText}`);
      }
    }
    
    throw new Error(`All namespaces failed for ${serverSlug}`);
    
  } catch (error) {
    console.error(`Server ${serverSlug} Error:`, error.message);
    return [];
  }
}
// Calculate prices from auction data
function calculateItemPrices(auctions, itemId, faction) {
  const itemAuctions = auctions.filter(auction => auction.item?.id === itemId);
  
  if (itemAuctions.length === 0) {
    return { alliance: 0, horde: 0, error: 'No auctions found' };
  }

  // Filter valid buyout auctions
  const validAuctions = itemAuctions.filter(a => a.buyout && a.buyout > 0);
  
  if (validAuctions.length === 0) {
    return { alliance: 0, horde: 0, error: 'No buyout prices' };
  }

  // Calculate average of lowest 3 prices (more stable than just lowest)
  const sortedPrices = validAuctions
    .map(a => a.buyout / 10000) // Convert copper to gold
    .sort((a, b) => a - b);
    
  const sampleSize = Math.min(3, sortedPrices.length);
  const avgPrice = sortedPrices.slice(0, sampleSize).reduce((sum, price) => sum + price, 0) / sampleSize;
  
  // Round to 2 decimal places
  const roundedPrice = Math.round(avgPrice * 100) / 100;
  
  // For now, return same price for both factions (Classic doesn't separate by faction in API)
  // TODO: Could analyze seller names to determine faction, but complex
  return {
    alliance: roundedPrice,
    horde: roundedPrice,
    count: validAuctions.length,
    lowest: sortedPrices[0]
  };
}

// Fallback sample data (when API fails)
const samplePrices = {
  'Black Lotus': {
    dreamscythe: { alliance: 185, horde: 180 },
    nightslayer: { alliance: 195, horde: 192 },
    doomhowl: { alliance: 178, horde: 175 }
  },
  'Greater Fire Protection Potion': {
    dreamscythe: { alliance: 8, horde: 7 },
    nightslayer: { alliance: 12, horde: 11 },
    doomhowl: { alliance: 9, horde: 8 }
  },
  'Arcanite Bar': {
    dreamscythe: { alliance: 23, horde: 25 },
    nightslayer: { alliance: 28, horde: 27 },
    doomhowl: { alliance: 26, horde: 24 }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q: searchTerm, server, faction } = req.query;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term required' });
  }

  try {
    // Search our item database
    const items = searchItemsByName(searchTerm);
    
    if (items.length === 0) {
      return res.json({ items: [], message: 'No items found' });
    }

    // Try to get real Blizzard data
    let useRealData = false;
    let token = null;
    
    if (process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET) {
      token = await getBlizzardToken();
      useRealData = !!token;
    }

    const results = [];

    for (const item of items.slice(0, 5)) { // Limit to 5 items for performance
      try {
        let itemPrices = {};

        if (useRealData && (server === 'all' || server)) {
          // Get real auction data
          const serversToCheck = server === 'all' 
            ? ['dreamscythe', 'nightslayer', 'doomhowl'] // Limit for performance
            : [server];

          for (const serverSlug of serversToCheck) {
            const auctions = await getServerAuctions(serverSlug, token);
            const prices = calculateItemPrices(auctions, item.id, faction);
            itemPrices[serverSlug] = prices;
          }
        } else {
          // Fallback to sample data
          itemPrices = samplePrices[item.name] || {
            dreamscythe: { alliance: 0, horde: 0, error: 'No data' }
          };
        }

        // Apply faction filtering
        const filteredPrices = {};
        Object.entries(itemPrices).forEach(([serverKey, prices]) => {
          if (faction === 'alliance') {
            filteredPrices[serverKey] = { alliance: prices.alliance, horde: 0, count: prices.count };
          } else if (faction === 'horde') {
            filteredPrices[serverKey] = { alliance: 0, horde: prices.horde, count: prices.count };
          } else {
            filteredPrices[serverKey] = prices;
          }
        });

        results.push({
          ...item,
          prices: filteredPrices,
          dataSource: useRealData ? 'blizzard-api' : 'sample-data',
          auctionCount: Object.values(filteredPrices).reduce((sum, p) => sum + (p.count || 0), 0)
        });

      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        // Add item with error state
        results.push({
          ...item,
          prices: { [server || 'dreamscythe']: { alliance: 0, horde: 0, error: 'API Error' } },
          dataSource: 'error'
        });
      }
    }

    return res.json({ 
      items: results,
      dataSource: useRealData ? 'blizzard-api' : 'sample-data',
      faction,
      server,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
