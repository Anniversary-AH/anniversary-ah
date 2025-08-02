// pages/api/search.js
// WORKING Anniversary Realm Search API

// WORKING Anniversary Realm Mapping
const ANNIVERSARY_REALM_MAPPING = {
  "dreamscythe": {
    connectedRealmId: 6103,
    namespace: "dynamic-classic1x-us",
    displayName: "Dreamscythe (Normal)"
  },
  "nightslayer": {
    connectedRealmId: 6104,
    namespace: "dynamic-classic1x-us",
    displayName: "Nightslayer (PvP)"
  },
  "doomhowl": {
    connectedRealmId: 6105,
    namespace: "dynamic-classic1x-us",
    displayName: "Doomhowl (Hardcore)"
  },
  "maladath": {
    connectedRealmId: 6131,
    namespace: "dynamic-classic1x-us",
    displayName: "Maladath (Oceanic)"
  }
};

// Sample data fallback
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
  'Black Lotus': {
    quality: 'epic',
    icon: 'inv_misc_herb_blacklotus', 
    prices: {
      dreamscythe: { alliance: 185, horde: 180 },
      nightslayer: { alliance: 195, horde: 192 },
      doomhowl: { alliance: 178, horde: 175 }
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
  'Mooncloth Bag': {
    quality: 'rare',
    icon: 'inv_misc_bag_10',
    prices: {
      dreamscythe: { alliance: 45, horde: 48 },
      nightslayer: { alliance: 52, horde: 55 },
      doomhowl: { alliance: 42, horde: 44 }
    }
  }
};

export default async function handler(req, res) {
  const { q: searchQuery, server: selectedServer, faction: selectedFaction } = req.query;
  
  if (!searchQuery) {
    return res.status(400).json({ error: 'Search query required' });
  }
  
  try {
    // Check configured realms
    const configuredRealms = Object.entries(ANNIVERSARY_REALM_MAPPING)
      .filter(([_, config]) => config.connectedRealmId && config.connectedRealmId > 0);
    
    console.log(`📊 Found ${configuredRealms.length} configured Anniversary realms`);
    
    // Get access token
    const tokenResponse = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Determine which servers to check
    const serversToCheck = selectedServer === 'all' 
      ? configuredRealms.map(([key]) => key)
      : [selectedServer].filter(server => 
          ANNIVERSARY_REALM_MAPPING[server]?.connectedRealmId
        );
    
    console.log(`🎯 Checking servers: ${serversToCheck.join(', ')}`);
    
    const itemPrices = {};
    let foundLiveData = false;
    
    // Test Anniversary realm auction houses
    for (const serverKey of serversToCheck) {
      const realmConfig = ANNIVERSARY_REALM_MAPPING[serverKey];
      
      try {
        console.log(`🏰 Testing server: ${serverKey} (ID: ${realmConfig.connectedRealmId})`);
        
        // Test auction API
        const response = await fetch(
          `https://us.api.blizzard.com/data/wow/connected-realm/${realmConfig.connectedRealmId}/auctions?namespace=${realmConfig.namespace}&locale=en_US`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          }
        );
        
        console.log(`   Auction API response: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          const auctions = data.auctions || [];
          console.log(`   Found ${auctions.length} auctions`);
          
          // If we find auctions, search for the item
          if (auctions.length > 0) {
            const itemAuctions = auctions.filter(auction => 
              auction.item?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            if (itemAuctions.length > 0) {
              foundLiveData = true;
              const prices = itemAuctions.map(a => Math.floor((a.buyout || a.bid || 0) / 10000)).filter(p => p > 0);
              const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
              
              itemPrices[serverKey] = {
                alliance: minPrice,
                horde: minPrice,
                count: itemAuctions.length,
                note: 'Live auction data'
              };
            } else {
              itemPrices[serverKey] = {
                alliance: 0,
                horde: 0,
                count: 0,
                error: 'Item not found in auctions'
              };
            }
          } else {
            itemPrices[serverKey] = {
              alliance: 0,
              horde: 0,
              count: 0,
              error: 'Auction house empty (fresh realm)'
            };
          }
        } else {
          itemPrices[serverKey] = {
            alliance: 0,
            horde: 0,
            count: 0,
            error: 'Auction house not active yet'
          };
        }
        
      } catch (error) {
        console.error(`❌ Server ${serverKey} error:`, error.message);
        itemPrices[serverKey] = {
          alliance: 0,
          horde: 0,
          count: 0,
          error: error.message
        };
      }
    }
    
    // Return results
    const results = [];
    
    if (foundLiveData) {
      // Return live auction data
      const itemInfo = sampleItems[searchQuery] || { quality: 'unknown', icon: 'inv_misc_questionmark' };
      
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
      // Fall back to sample data with live realm status
      const fallbackResults = Object.keys(sampleItems).filter(item =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      for (const itemName of fallbackResults) {
        results.push({
          name: itemName,
          ...sampleItems[itemName],
          dataSource: 'sample-data',
          note: 'Sample data - Anniversary realms found but auction houses not active yet',
          realmStatus: itemPrices
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
    console.error('💥 Search API error:', error);
    
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
