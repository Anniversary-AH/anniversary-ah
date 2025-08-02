// pages/api/get-all-anniversary.js
// Get ALL Anniversary realms from the CORRECT namespace: dynamic-classic1x-us

export default async function handler(req, res) {
  try {
    console.log('🎉 Getting ALL Anniversary realms from dynamic-classic1x-us namespace...');
    
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
    
    // Get ALL connected realms from Anniversary namespace
    const indexResponse = await fetch(
      'https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-classic1x-us&locale=en_US',
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
    
    console.log(`✅ Found ${connectedRealms.length} connected realms in Anniversary namespace`);
    
    const results = {
      timestamp: new Date().toISOString(),
      namespace: 'dynamic-classic1x-us',
      connectedRealmCount: connectedRealms.length,
      allRealms: [],
      anniversaryRealms: [],
      otherRealms: [],
      realmMapping: {}
    };
    
    // Anniversary realm names we're looking for
    const anniversaryKeywords = [
      'dreamscythe', 'nightslayer', 'doomhowl', 
      'thunderstrike', 'spineshatter', 'soulseeker', 'maladath'
    ];
    
    // Check EVERY connected realm in the Anniversary namespace
    for (const connectedRealm of connectedRealms) {
      try {
        const realmId = connectedRealm.href.match(/\/(\d+)\?/)?.[1];
        if (!realmId) continue;
        
        console.log(`Testing connected realm ${realmId}...`);
        
        // Get realm details
        const realmResponse = await fetch(
          `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}?namespace=dynamic-classic1x-us&locale=en_US`,
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
          
          // Check for Anniversary realm names
          const isAnniversary = anniversaryKeywords.some(keyword => 
            realmName.includes(keyword) || realmSlug.includes(keyword)
          );
          
          if (isAnniversary) {
            console.log(`🎉 FOUND Anniversary realm: ${realm.name} (Connected Realm ${realmId})`);
            
            // Test auction access
            const auctionResponse = await fetch(
              `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=dynamic-classic1x-us&locale=en_US`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json'
                }
              }
            );
            
            let auctionCount = 0;
            if (auctionResponse.ok) {
              try {
                const auctionData = await auctionResponse.json();
                auctionCount = auctionData.auctions?.length || 0;
              } catch {
                auctionCount = 0;
              }
            }
            
            const anniversaryRealmInfo = {
              ...realmInfo,
              auctionsWorking: auctionResponse.ok,
              auctionStatus: auctionResponse.status,
              auctionCount: auctionCount
            };
            
            results.anniversaryRealms.push(anniversaryRealmInfo);
            
            // Add to realm mapping for easy config generation
            const mappingKey = realm.slug || realm.name.toLowerCase().replace(/[^a-z]/g, '');
            results.realmMapping[mappingKey] = {
              connectedRealmId: parseInt(realmId),
              namespace: 'dynamic-classic1x-us',
              displayName: realm.name
            };
            
            console.log(`   Auctions: ${auctionResponse.ok ? `${auctionCount} auctions` : `Failed (${auctionResponse.status})`}`);
          } else {
            results.otherRealms.push(realmInfo);
          }
        }
        
      } catch (realmError) {
        console.log(`Error processing realm ${realmId}: ${realmError.message}`);
      }
    }
    
    // Generate the final config code
    const configCode = `// WORKING Anniversary Realm Mapping - FINAL VERSION!
const ANNIVERSARY_REALM_MAPPING = ${JSON.stringify(results.realmMapping, null, 2)};

// Usage instructions:
// 1. Copy this mapping into your pages/api/search.js file
// 2. Replace the existing ANNIVERSARY_REALM_MAPPING object
// 3. Deploy and test with live Anniversary realm data!`;
    
    // Create summary with found vs missing realms
    const foundRealmNames = results.anniversaryRealms.map(r => r.name.toLowerCase());
    const missingRealms = anniversaryKeywords.filter(keyword => 
      !foundRealmNames.some(name => name.includes(keyword))
    );
    
    const summary = {
      totalConnectedRealmsChecked: connectedRealms.length,
      anniversaryRealmsFound: results.anniversaryRealms.length,
      foundRealmNames: results.anniversaryRealms.map(r => r.name),
      missingRealmNames: missingRealms,
      workingAuctionHouses: results.anniversaryRealms.filter(r => r.auctionsWorking).length,
      namespace: 'dynamic-classic1x-us'
    };
    
    console.log(`✅ Complete scan finished! Found ${results.anniversaryRealms.length}/7 Anniversary realms`);
    
    res.status(200).json({
      success: true,
      message: `Found ${results.anniversaryRealms.length} Anniversary realms in the correct namespace!`,
      ...results,
      summary,
      configCode
    });
    
  } catch (error) {
    console.error('Get all Anniversary realms error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
