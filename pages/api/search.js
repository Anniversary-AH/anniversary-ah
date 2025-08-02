import { searchItemsByName, getItemById } from '../../lib/items-database';
import { getServerAuctions, findItemInAuctions } from '../../lib/blizzard-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q: searchTerm, server, faction } = req.query; // NOW INCLUDES FACTION

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term required' });
  }

  try {
    // Search our item database first
    const items = searchItemsByName(searchTerm);
    
    if (items.length === 0) {
      return res.json({ items: [], message: 'No items found' });
    }

    // Sample price data with faction-aware filtering
    const samplePrices = {
      'Black Lotus': {
        dreamscythe: { alliance: 185, horde: 180 },
        nightslayer: { alliance: 195, horde: 192 },
        doomhowl: { alliance: 178, horde: 175 },
        thunderstrike: { alliance: 188, horde: 185 },
        spineshatter: { alliance: 198, horde: 195 },
        maladath: { alliance: 205, horde: 200 }
      },
      'Greater Fire Protection Potion': {
        dreamscythe: { alliance: 8, horde: 7 },
        nightslayer: { alliance: 12, horde: 11 },
        doomhowl: { alliance: 9, horde: 8 },
        thunderstrike: { alliance: 10, horde: 9 },
        spineshatter: { alliance: 11, horde: 10 },
        maladath: { alliance: 13, horde: 12 }
      },
      'Elixir of the Mongoose': {
        dreamscythe: { alliance: 15, horde: 14 },
        nightslayer: { alliance: 18, horde: 17 },
        doomhowl: { alliance: 16, horde: 15 },
        thunderstrike: { alliance: 17, horde: 16 },
        spineshatter: { alliance: 19, horde: 18 },
        maladath: { alliance: 20, horde: 19 }
      },
      'Arcanite Bar': {
        dreamscythe: { alliance: 23, horde: 25 },
        nightslayer: { alliance: 28, horde: 27 },
        doomhowl: { alliance: 26, horde: 24 },
        thunderstrike: { alliance: 25, horde: 24 },
        spineshatter: { alliance: 29, horde: 28 },
        maladath: { alliance: 31, horde: 30 }
      },
      'Mooncloth Bag': {
        dreamscythe: { alliance: 45, horde: 48 },
        nightslayer: { alliance: 52, horde: 55 },
        doomhowl: { alliance: 42, horde: 44 },
        thunderstrike: { alliance: 48, horde: 50 },
        spineshatter: { alliance: 54, horde: 56 },
        maladath: { alliance: 58, horde: 60 }
      },
      // Add comprehensive pricing for new items from database
      'Linen Cloth': {
        dreamscythe: { alliance: 0.5, horde: 0.6 },
        nightslayer: { alliance: 0.8, horde: 0.7 },
        doomhowl: { alliance: 0.4, horde: 0.5 }
      },
      'Runecloth': {
        dreamscythe: { alliance: 2.5, horde: 2.8 },
        nightslayer: { alliance: 3.2, horde: 3.0 },
        doomhowl: { alliance: 2.1, horde: 2.4 }
      },
      'Large Brilliant Shard': {
        dreamscythe: { alliance: 15, horde: 18 },
        nightslayer: { alliance: 22, horde: 19 },
        doomhowl: { alliance: 12, horde: 14 }
      },
      'Illusion Dust': {
        dreamscythe: { alliance: 1.2, horde: 1.5 },
        nightslayer: { alliance: 1.8, horde: 1.6 },
        doomhowl: { alliance: 1.0, horde: 1.3 }
      }
    };

    // Helper function to filter prices by faction
    const filterPricesByFaction = (prices, selectedFaction) => {
      if (!prices) return prices;
      
      switch (selectedFaction) {
        case 'alliance':
          // Return only Alliance prices, but keep both for display logic
          return { alliance: prices.alliance, horde: 0 };
        case 'horde':
          // Return only Horde prices, but keep both for display logic  
          return { alliance: 0, horde: prices.horde };
        case 'both':
        default:
          // Return both prices
          return prices;
      }
    };

    // Filter servers if specific server selected
    const getFilteredPrices = (itemPrices) => {
      if (!itemPrices) return {};
      
      if (server && server !== 'all') {
        // Single server selected
        const serverPrices = itemPrices[server];
        if (serverPrices) {
          return { [server]: filterPricesByFaction(serverPrices, faction) };
        }
        return { [server]: { alliance: 0, horde: 0, error: 'No data' } };
      } else {
        // All servers - apply faction filter to each
        const filteredPrices = {};
        Object.entries(itemPrices).forEach(([serverKey, prices]) => {
          filteredPrices[serverKey] = filterPricesByFaction(prices, faction);
        });
        return filteredPrices;
      }
    };

    // Add price data to items with faction filtering
    const itemsWithPrices = items.map(item => {
      const itemPrices = samplePrices[item.name];
      
      return {
        ...item,
        prices: getFilteredPrices(itemPrices) || {
          dreamscythe: { alliance: 0, horde: 0, error: 'No data' },
          nightslayer: { alliance: 0, horde: 0, error: 'No data' },
          doomhowl: { alliance: 0, horde: 0, error: 'No data' }
        },
        auctionCount: Math.floor(Math.random() * 20) + 1,
        fallbackData: true,
        selectedFaction: faction // Include faction info for frontend
      };
    });

    return res.json({ 
      items: itemsWithPrices,
      faction: faction,
      server: server 
    });
    
  } catch (error) {
    console.error('Search API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
