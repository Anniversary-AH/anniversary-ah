// pages/api/working-discovery.js
// Anniversary realm discovery using WORKING authentication method

export default async function handler(req, res) {
  try {
    console.log('🎉 Starting Anniversary discovery with WORKING auth method...');
    
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
      throw new Error(`Token failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('✅ Got access token');
    
    // Get connected realm index using WORKING method (Authorization header)
    const indexResponse = await fetch(
      'https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-classic-us&locale=en_US',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!indexResponse.ok) {
      throw new Error(`Index failed: ${indexResponse.status}`);
    }
    
    const indexData = await indexResponse.json();
    const connectedRealms = indexData.connected_realms || [];
    
    console.log(`✅ Found ${connectedRealms.length} connected realms`);
    
    const results = {
      timestamp: new Date().toISOString(),
      authMethod: 'Authorization header (WORKING)',
      connectedRealmCount: connectedRealms.length,
      allRealms: [],
      anniversaryRealms: [],
      possibleAnniversaryRealms: []
    };
    
    // Test each connected realm for Anniversary realms
    for (const connectedRealm of connectedRealms) {
      try {
        const realmId = connectedRealm.href.match(/\/(\d+)\?/)?.[1];
        if (!realmId) continue;
        
        console.log(`Testing connected realm ${realmId}...`);
        
        // Get realm details using WORKING method
        const realmResponse = await fetch(
          `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}?namespace=dynamic-classic-us&locale=en_US`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (!realmResponse.ok) {
          console.log(`❌ Realm ${realmId} failed: ${realmResponse.status}`);
          continue;
        }
        
        const realmData = await realmResponse.json();
        
        // Check each realm in this connected realm
        for (const realm of realmData.realms || []) {
          const realmInfo = {
            connectedRealmId: parseInt(realmId),
            realmId: realm.id,
            name: realm.name,
            slug: realm.slug,
            category: realm.category?.name || 'unknown',
            locale: realm.locale || 'unknown',
            timezone: realm.timezone || 'unknown'
          };
          
          results.allRealms.push(realmInfo);
          
          const realmName = realm.name.toLowerCase();
          const realmSlug = realm.slug?.toLowerCase() || '';
          
          // Check for exact Anniversary realm names
          const anniversaryKeywords = [
            'dreamscythe', 'nightslayer', 'doomhowl', 
            'thunderstrike', 'spineshatter', 'soulseeker', 'maladath'
          ];
          
          const isExactAnniversary = anniversaryKeywords.some(keyword => 
            realmName.includes(keyword) || realmSlug.includes(keyword)
          );
          
          if (isExactAnniversary) {
            console.log(`🎉 FOUND Anniversary realm: ${realm.name} (Connected Realm ${realmId})`);
            
            // Test auction access
            const auctionResponse = await fetch(
              `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=dynamic-classic-us&locale=en_US`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json'
                }
              }
            );
            
            const auctionCount = auctionResponse.ok ? 
              (await auctionResponse.json()).auctions?.length || 0 : 0;
            
            results.anniversaryRealms.push({
              ...realmInfo,
              auctionsWorking: auctionResponse.ok,
              auctionStatus: auctionResponse.status,
              auctionCount: auctionCount
            });
          } else {
            // Check for possible Anniversary indicators
            const possibleIndicators = [
              'anniversary', 'fresh', 'new', '2024', '2025'
            ];
            
            const mightBeAnniversary = possibleIndicators.some(keyword => 
              realmName.includes(keyword) || realmSlug.includes(keyword)
            ) || parseInt(realmId) > 4350; // High realm IDs might be new
            
            if (mightBeAnniversary) {
              results.possibleAnniversaryRealms.push(realmInfo);
            }
          }
        }
        
      } catch (realmError) {
        console.log(`Error processing realm: ${realmError.message}`);
      }
    }
    
    // Generate config code if Anniversary realms found
    let configCode = '';
    if (results.anniversaryRealms.length > 0) {
      const mapping = {};
      
      for (const realm of results.anniversaryRealms) {
        if (realm.auctionsWorking) {
          // Map by slug or name
          const key = realm.slug || realm.name.toLowerCase().replace(/[^a-z]/g, '');
          mapping[key] = {
            connectedRealmId: realm.connectedRealmId,
            namespace: 'dynamic-classic-us',
            displayName: realm.name
          };
        }
      }
      
      configCode = `// WORKING Anniversary Realm Mapping:
const ANNIVERSARY_REALM_MAPPING = ${JSON.stringify(mapping, null, 2)};`;
    }
    
    console.log(`✅ Discovery complete! Found ${results.anniversaryRealms.length} Anniversary realms`);
    
    res.status(200).json({
      success: true,
      message: `Found ${results.anniversaryRealms.length} Anniversary realms and ${results.allRealms.length} total realms`,
      ...results,
      configCode
    });
    
  } catch (error) {
    console.error('Working discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
