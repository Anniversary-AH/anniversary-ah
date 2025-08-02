import { searchItemsByName, getItemById } from '../../lib/items-database';
import { getServerAuctions, findItemInAuctions } from '../../lib/blizzard-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q: searchTerm, server } = req.query;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term required' });
  }

  try {
    // Search our item database first
    const items = searchItemsByName(searchTerm);
    
    if (items.length === 0) {
      return res.json({ items: [], message: 'No items found' });
    }

    // Add sample price data for now (until Blizzard API keys are added)
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
      'Elixir of the Mongoose': {
        dreamscythe: { alliance: 15, horde: 14 },
        nightslayer: { alliance: 18, horde: 17 },
        doomhowl: { alliance: 16, horde: 15 }
      }
    };

    // Add price data to items
    const itemsWithPrices = items.map(item => ({
      ...item,
      prices: samplePrices[item.name] || {
        dreamscythe: { alliance: 0, horde: 0, error: 'No data' },
        nightslayer: { alliance: 0, horde: 0, error: 'No data' },
        doomhowl: { alliance: 0, horde: 0, error: 'No data' }
      },
      auctionCount: Math.floor(Math.random() * 20) + 1, // Random sample count
      fallbackData: true
    }));

    return res.json({ items: itemsWithPrices });
    
  } catch (error) {
    console.error('Search API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
