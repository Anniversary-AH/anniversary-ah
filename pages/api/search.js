// pages/api/search.js
// Updated Anniversary Realm Search API

import { getBlizzardAccessToken, getAuctionData, searchAuctionsForItem, parseAuctionPrices } from '../../lib/blizzard-api.js';
import { getItemByName, getFallbackItemData } from '../../lib/items-database.js';

// IMPORTANT: Update this mapping with results from /api/debug
// Step 1: Run https://your-domain.vercel.app/api/debug
// Step 2: Copy the "configCode" from the JSON response
// Step 3: Replace the mapping below with that code
const ANNIVERSARY_REALM_MAPPING = {
  // REPLACE THIS AFTER RUNNING /api/debug
  'dreamscythe': {
    connectedRealmId: null, // Fill from debug results
    namespace: 'dynamic-classic-us',
    displayName: 'Dreamscythe (Normal)'
  },
  'nightslayer': {
    connectedRealmId: null, // Fill from debug results  
    namespace: 'dynamic-classic-us',
    displayName: 'Nightslayer (PvP)'
  },
  'doomhowl': {
    connectedRealmId: null, // Fill from debug results
    namespace: 'dynamic-classic-us', 
    displayName: 'Doomhowl (Hardcore)'
  },
  'thunderstrike': {
    connectedRealmId: null, // Fill from debug results
    namespace: 'dynamic-classic-us',
    displayName: 'Thunderstrike (EU Normal)'
  },
  'spineshatter': {
    connectedRealmId: null, // Fill from debug results
    namespace: 'dynamic-classic-us',
    displayName: 'Spineshatter (EU PvP)'
  },
  'soulseeker': {
    connectedRealmId: null, // Fill from debug results
    namespace: 'dynamic-classic-us', 
    displayName: 'Soulseeker (EU Hardcore)'
  },
  'maladath': {
    connectedRealmId: null, // Fill from debug results
    namespace: 'dynamic-classic-us',
    displayName: 'Maladath (Oceanic)'
  }
};

// Get auction data for a specific Anniversary realm
async function getServerAuctions(serverKey, accessToken) {
  const realmConfig = ANNIVERSARY_REALM_MAPPING[serverKey];
  
  if (!realmConfig || !realmConfig.connectedRealmId) {
    throw new Error(`Server ${serverKey} not configured. Run /api/debug first!`);
  }
  
  console.log(`Server ${serverKey}: Fetching auctions for Connected Realm ID: ${realmConfig.connectedRealmId}`);
  
  const auctions = await getAuctionData(
    realmConfig.connectedRealmId, 
    realmConfig.namespace, 
    accessToken
  );
  
  console.log(`Server ${serverKey}: Found ${auctions.length} total auctions`);
  return auctions;
}

// Fallback sample data (your existing data)
const sampleItems = {
  'Greater Fire Protection Potion': {
    quality: 'uncommon',
    icon: 'inv_potion_24',
    prices: {
      dreamscythe: { alliance: 8, horde: 7 },
      nightslayer: { alliance: 12, horde: 11 },
      doomhowl: { alliance: 9, horde: 8 }
    }
  },
  'Mooncloth Bag': {
    quality: 'rare', 
    icon: 'inv_misc_bag_10',
    prices: {
      dreamscythe: { alliance: 45, horde: 48 },
      nightslayer: { alliance: 52, horde: 55 },
      doomhowl: { alliance: 42, horde: 44 }
    }
  },
  'Black Lotus': {
    quality: 'epic',
    icon: 'inv_misc_herb_blacklotus', 
    prices: {
      dreamscythe: { alliance: 185, horde: 180 },
      nightslayer: { alliance: 195, horde: 192 },
      doomhowl: { alliance: 178, horde: 175 }
    }
  },
  'Elixir of the Mongoose': {
    quality: 'uncommon',
    icon: 'inv_potion_32',
    prices: {
      dreamscythe: { alliance: 15, horde: 14 },
      nightslayer: { alliance: 18, horde: 17 },
      doomhowl: { alliance: 16, horde: 15 }
    }
  },
  'Arcanite Bar': {
    quality: 'uncommon',
    icon: 'inv_ingot_08',
    prices: {
      dreamscythe: { alliance: 23, horde: 25 },
      nightslayer: { alliance: 28, horde: 27 },
      doomhowl: { alliance: 26, horde: 24 }
    }
  }
};

export default async function handler(req, res) {
  const { q: searchQuery, server: selectedServer, faction: selectedFaction } = req.query;
  
  if (!searchQuery) {
    return res.status(400).json({ error: 'Search query required' });
  }
  
  console.log(`Search request: "${searchQuery}" on server: ${selectedServer}, faction: ${selectedFaction}`);
  
  try {
    // Check if any realm is configured
    const configuredRealms = Object.entries(ANNIVERSARY_REALM_MAPPING)
      .filter(([_, config]) => config.connectedRealmId !== null);
    
    if (configuredRealms.length === 0) {
      console.log('⚠️ No realms configured, using sample data');
      
      // Fall back to sample data
      const fallbackResults = Object.keys(sampleItems).filter(item =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return res.status(200).json({
        items: fallbackResults.map(name => ({
          name,
          ...sampleItems[name],
          dataSource: 'sample-data',
          warning: 'Run /api/debug to configure live data'
        })),
        warning: 'No realms configured. Visit /api/debug to set up live data.'
      });
    }
    
    const accessToken = await getBlizzardAccessToken();
    const results = [];
    
    // Determine which servers to check
    const serversToCheck = selectedServer === 'all' 
      ? configuredRealms.map(([key]) => key)
      : [selectedServer].filter(server => 
          ANNIVERSARY_REALM_MAPPING[server]?.connectedRealmId
        );
    
    console.log(`Checking servers: ${serversToCheck.join(', ')}`);
    
    if (serversToCheck.length === 0) {
      throw new Error(`Selected server "${selectedServer}" is not configured. Run /api/debug first!`);
    }
    
    // Try to get live data from configured realms
    let foundLiveData = false;
    const itemPrices = {};
    
    for (const serverKey of serversToCheck) {
      try {
        console.log(`Fetching data for server: ${serverKey}`);
        const auctions = await getServerAuctions(serverKey, accessToken);
        
        // Search for the item in auctions
        const itemAuctions = searchAuctionsForItem(auctions, searchQuery);
        console.log(`Server ${serverKey}: Found ${itemAuctions.length} auctions for "${searchQuery}"`);
        
        // Parse prices
        const prices = parseAuctionPrices(itemAuctions);
        
        if (prices.count > 0) {
          foundLiveData = true;
          itemPrices[serverKey] = prices;
        } else {
          itemPrices[serverKey] = { 
            alliance: 0, 
            horde: 0, 
            error: 'Item not found in auctions',
            count: 0 
          };
        }
        
      } catch (serverError) {
        console.error(`Server ${serverKey} Error:`, serverError.message);
        itemPrices[serverKey] = { 
          alliance: 0, 
          horde: 0, 
          error: serverError.message,
          count: 0
        };
      }
    }
    
    if (foundLiveData) {
      // Get item info from database
      const itemInfo = getItemByName(searchQuery) || getFallbackItemData(searchQuery);
      
      // Return live auction data
      results.push({
        name: searchQuery,
        quality: itemInfo.quality,
        icon: itemInfo.icon,
        prices: itemPrices,
        dataSource: 'blizzard-api',
        auctionCount: Object.values(itemPrices).reduce((sum, p) => sum + (p.count || 0), 0),
        note: 'Live auction house data from Anniversary realms'
      });
    } else {
      // Fall back to sample data if no live data found
      console.log('No live data found, falling back to sample data');
      const fallbackResults = Object.keys(sampleItems).filter(item =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      for (const itemName of fallbackResults) {
        results.push({
          name: itemName,
          ...sampleItems[itemName],
          dataSource: 'sample-data',
          note: 'Sample data - item not found in live auctions'
        });
      }
    }
    
    res.status(200).json({
      items: results,
      searchQuery,
      selectedServer,
      selectedFaction,
      serversChecked: serversToCheck,
      configuredRealms: configuredRealms.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Always fall back to sample data on error
    const fallbackResults = Object.keys(sampleItems).filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    res.status(200).json({
      items: fallbackResults.map(name => ({
        name,
        ...sampleItems[name],
        dataSource: 'fallback-error',
        error: error.message
      })),
      fallbackUsed: true,
      error: error.message,
      searchQuery,
      timestamp: new Date().toISOString()
    });
  }
}
