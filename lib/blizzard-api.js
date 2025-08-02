// Blizzard API integration for Anniversary realms
const BLIZZARD_API_BASE = 'https://us.api.blizzard.com';

// Get OAuth token
async function getBlizzardToken() {
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

  const data = await response.json();
  return data.access_token;
}

// Get auction data for a specific server
export async function getServerAuctions(serverSlug) {
  try {
    const token = await getBlizzardToken();
    
    // Anniversary realms are connected realms, need to get connected realm ID first
    const realmResponse = await fetch(
      `${BLIZZARD_API_BASE}/data/wow/realm/${serverSlug}?namespace=dynamic-classic1x-us&locale=en_US&access_token=${token}`
    );
    
    if (!realmResponse.ok) {
      throw new Error(`Realm API error: ${realmResponse.status}`);
    }
    
    const realmData = await realmResponse.json();
    const connectedRealmId = realmData.connected_realm?.href?.split('/').pop();
    
    if (!connectedRealmId) {
      throw new Error('Could not find connected realm ID');
    }

    // Get auction house data
    const auctionResponse = await fetch(
      `${BLIZZARD_API_BASE}/data/wow/connected-realm/${connectedRealmId}/auctions?namespace=dynamic-classic1x-us&locale=en_US&access_token=${token}`
    );

    if (!auctionResponse.ok) {
      throw new Error(`Auction API error: ${auctionResponse.status}`);
    }

    const auctionData = await auctionResponse.json();
    return auctionData.auctions || [];
    
  } catch (error) {
    console.error('Blizzard API Error:', error);
    return [];
  }
}

// Search for specific item in auction data
export function findItemInAuctions(auctions, itemId) {
  return auctions.filter(auction => auction.item?.id === itemId);
}

// Get item details
export async function getItemDetails(itemId) {
  try {
    const token = await getBlizzardToken();
    
    const response = await fetch(
      `${BLIZZARD_API_BASE}/data/wow/item/${itemId}?namespace=static-classic1x-us&locale=en_US&access_token=${token}`
    );

    if (!response.ok) {
      throw new Error(`Item API error: ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('Item API Error:', error);
    return null;
  }
}
