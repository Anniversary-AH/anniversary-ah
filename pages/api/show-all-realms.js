// pages/api/show-all-realms.js
// Show ALL realm names in all connected realms to find Anniversary realms

export default async function handler(req, res) {
  try {
    console.log('🔍 Fetching ALL realm names from all connected realms...');
    
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
    
    const results = {
      timestamp: new Date().toISOString(),
      endpoints: {},
      allRealmNames: [],
      possibleAnniversaryRealms: [],
      summary: {}
    };
    
    // Test multiple endpoints and namespaces
    const endpointsToTest = [
      { region: 'us', base: 'https://us.api.blizzard.com', namespace: 'dynamic-classic-us' },
      { region: 'us', base: 'https://us.api.blizzard.com', namespace: 'static-classic-us' },
      { region: 'eu', base: 'https://eu.api.blizzard.com', namespace: 'dynamic-classic-eu' },
      { region: 'eu', base: 'https://eu.api.blizzard.com', namespace: 'static-classic-eu' }
    ];
    
    for (const endpoint of endpointsToTest) {
      const endpointKey = `${endpoint.region}-${endpoint.namespace}`;
      console.log(`Testing ${endpointKey}...`);
      
      try {
        // Get connected realm index
        const indexResponse = await fetch(
          `${endpoint.base}/data/wow/connected-realm/index?namespace=${endpoint.namespace}&locale=en_US&access_token=${accessToken}`
        );
        
        if (!indexResponse.ok) {
          results.endpoints[endpointKey] = {
            status: indexResponse.status,
            error: 'Failed to get connected realm index'
          };
          continue;
        }
        
        const indexData = await indexResponse.json();
        const connectedRealms = indexData.connected_realms || [];
        
        console.log(`${endpointKey}: Found ${connectedRealms.length} connected realms`);
        
        const endpointRealms = [];
        const endpointPossible = [];
        
        // Get details for each connected realm
        for (const connectedRealm of connectedRealms.slice(0, 10)) { // Limit to first 10 to avoid timeout
          try {
            const detailResponse = await fetch(
              `${endpoint.base}${connectedRealm.href}?access_token=${accessToken}`
            );
            
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              
              for (const realm of detailData.realms || []) {
                const realmInfo = {
                  name: realm.name,
                  slug: realm.slug,
                  connectedRealmId: detailData.id,
                  endpoint: endpointKey,
                  category: realm.category?.name || 'unknown',
                  locale: realm.locale || 'unknown',
                  timezone: realm.timezone || 'unknown'
                };
                
                endpointRealms.push(realmInfo);
                results.allRealmNames.push(`${realm.name} (${endpointKey})`);
                
                // Check if this might be an Anniversary realm
                const realmName = realm.name.toLowerCase();
                const realmSlug = realm.slug?.toLowerCase() || '';
                
                // Look for Anniversary keywords (including partial matches)
                const anniversaryKeywords = [
                  'dreamscythe', 'nightslayer', 'doomhowl', 
                  'thunderstrike', 'spineshatter', 'soulseeker', 'maladath',
                  // Also look for "anniversary", "fresh", "new", etc.
                  'anniversary', 'fresh', 'new', '2024'
                ];
                
                const mightBeAnniversary = anniversaryKeywords.some(keyword => 
                  realmName.includes(keyword) || realmSlug.includes(keyword)
                ) || 
                // Look for realms created recently (high realm IDs might indicate new realms)
                detailData.id > 4300;
                
                if (mightBeAnniversary) {
                  endpointPossible.push(realmInfo);
                  results.possibleAnniversaryRealms.push(realmInfo);
                  console.log(`🤔 Possible Anniversary realm: ${realm.name} (${endpointKey})`);
                }
              }
            }
          } catch (detailError) {
            console.log(`Error getting details for connected realm: ${detailError.message}`);
          }
        }
        
        results.endpoints[endpointKey] = {
          status: 200,
          connectedRealmCount: connectedRealms.length,
          testedConnectedRealms: Math.min(connectedRealms.length, 10),
          realmCount: endpointRealms.length,
          realms: endpointRealms,
          possibleAnniversaryRealms: endpointPossible
        };
        
      } catch (endpointError) {
        results.endpoints[endpointKey] = {
          status: 'error',
          error: endpointError.message
        };
      }
    }
    
    // Summary
    results.summary = {
      totalEndpointsTested: endpointsToTest.length,
      workingEndpoints: Object.keys(results.endpoints).filter(key => 
        results.endpoints[key].status === 200
      ).length,
      totalRealmsFound: results.allRealmNames.length,
      possibleAnniversaryRealmsFound: results.possibleAnniversaryRealms.length,
      recommendation: results.possibleAnniversaryRealms.length > 0 ?
        'Found possible Anniversary realms! Check the possibleAnniversaryRealms list.' :
        'No obvious Anniversary realms found. They might have unexpected names or be in different endpoints.'
    };
    
    console.log(`✅ Discovery complete. Found ${results.allRealmNames.length} total realms, ${results.possibleAnniversaryRealms.length} possible Anniversary realms`);
    
    res.status(200).json({
      success: true,
      message: `Found ${results.allRealmNames.length} realms across all endpoints`,
      ...results
    });
    
  } catch (error) {
    console.error('Show all realms error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
