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

    // If server specified, get real auction data
    if (server && server !== 'all') {
      const results = [];
      
      for (const item of items.slice(0, 3)) { // Limit to 3 items for API performance
        try {
          const auctions = await getServerAuctions(server);
          const itemAuctions = findItemInAuctions(auctions, item.id);
          
          // Calculate prices (alliance/horde/both)
          const prices = calculatePrices(itemAuctions);
          
          results.push({
            ...item,
            prices: { [server]: prices },
            auctionCount: itemAuctions.length
          });
        } catch (error) {
          console.error(`Error fetching auctions for ${item.name}:`, error);
          // Return item without auction data if API fails
          results.push({
            ...item,
            prices: { [server]: { alliance: 0, horde: 0, error: 'API Error' } },
            auctionCount: 0
          });
        }
      }
      
      return res.json({ items: results });
    }

    // Return items without auction data if no server specified
    return res.json({ items });
    
  } catch (error) {
    console.error('Search API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to calculate prices from auction data
function calculatePrices(auctions) {
  if (!auctions || auctions.length === 0) {
    return { alliance: 0, horde: 0, error: 'No auctions found' };
  }

  // Simple price calculation - find lowest buyout price
  const validAuctions = auctions.filter(a => a.buyout && a.buyout > 0);
  
  if (validAuctions.length === 0) {
    return { alliance: 0, horde: 0, error: 'No buyout prices' };
  }

  // Convert copper to gold and get minimum price
  const lowestPrice = Math.min(...validAuctions.map(a => a.buyout)) / 10000;
  
  // For now, return same price for both factions
  // TODO: Separate by faction when we have faction data
  return {
    alliance: Math.round(lowestPrice * 100) / 100,
    horde: Math.round(lowestPrice * 100) / 100,
    count: validAuctions.length
  };
}
