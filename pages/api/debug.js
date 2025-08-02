// pages/api/debug.js
// Anniversary Realm Discovery API

export default async function handler(req, res) {
  const BLIZZARD_API_BASE = 'https://us.api.blizzard.com';
  
  try {
    console.log('🔍 Starting Anniversary Realm Discovery...');
    
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
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('✅ Got access token');
    
    // Anniversary realm names to search for
    const anniversaryKeywords = [
      'dreamscythe', 'nightslayer', 'doomhowl', 
      'thunderstrike', 'spineshatter', 'soulseeker', 'maladath'
    ];
    
    const results = {
      timestamp: new Date().toISOString(),
      searchedNamespaces: [],
      foundRealms: {},
      allRealms: {},
      errors: [],
      configCode: ''
    };
    
    // Try different namespaces where Anniversary realms might be
    const namespacesToTry = [
      'dynamic-classic-us',    // Most likely for Anniversary
      'static-classic-us',     // Classic Era
      'dynamic-us',            // Regular WoW dynamic
      'static-us',             // Regular WoW static
      'dynamic-classic-eu',    // EU Classic
      'static-classic-eu'      // EU Classic static
    ];
    
    for (const namespace of namespacesToTry) {
      try {
        console.log(`🔍 Checking namespace: ${namespace}`);
        results.searchedNamespaces.push(namespace);
        
        // Get realm index
        const realmResponse = await fetch(
          `${BLIZZARD_API_BASE}/data/wow/realm/index?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
        );
        
        if (!realmResponse.ok) {
          results.errors.push(`Realm index failed for ${namespace}: ${realmResponse.status}`);
          continue;
        }
        
        const realmData = await realmResponse.json();
        const realms = realmData.realms || [];
        
        console.log(`Found ${realms.length} realms in ${namespace}`);
        
        // Store all realms for debugging
        results.allRealms[namespace] = realms.map(r => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          category: r.category?.name || 'unknown'
        }));
        
        // Search for Anniversary realms
        for (const realm of realms) {
          const realmName = realm.name.toLowerCase();
          const realmSlug = realm.slug?.toLowerCase() || '';
          
          const isAnniversary = anniversaryKeywords.some(keyword => 
            realmName.includes(keyword) || realmSlug.includes(keyword)
          );
          
          if (isAnniversary) {
            console.log(`✨ Found Anniversary realm: ${realm.name} (ID: ${realm.id})`);
            
            // Get connected realm info
            try {
              const connectedRealmResponse = await fetch(
                `${BLIZZARD_API_BASE}/data/wow/connected-realm/index?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
              );
              
              if (connectedRealmResponse.ok) {
                const connectedData = await connectedRealmResponse.json();
                
                // Find which connected realm this realm belongs to
                let connectedRealmId = null;
                
                for (const connectedRealm of connectedData.connected_realms || []) {
                  try {
                    const connectedDetailResponse = await fetch(
                      `${BLIZZARD_API_BASE}${connectedRealm.href}?access_token=${accessToken}`
                    );
                    
                    if (connectedDetailResponse.ok) {
                      const connectedDetail = await connectedDetailResponse.json();
                      
                      const belongsToConnected = connectedDetail.realms?.some(r => 
                        r.id === realm.id || r.slug === realm.slug
                      );
                      
                      if (belongsToConnected) {
                        connectedRealmId = connectedDetail.id;
                        
                        // Test auction access
                        const auctionResponse = await fetch(
                          `${BLIZZARD_API_BASE}/data/wow/connected-realm/${connectedDetail.id}/auctions?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
                        );
                        
                        const auctionCount = auctionResponse.ok ? 
                          (await auctionResponse.json()).auctions?.length || 0 : 0;
                        
                        results.foundRealms[realm.slug || realmName] = {
                          realmId: realm.id,
                          realmName: realm.name,
                          realmSlug: realm.slug,
                          connectedRealmId: connectedDetail.id,
                          namespace: namespace,
                          auctionWorking: auctionResponse.ok,
                          auctionStatus: auctionResponse.status,
                          auctionCount: auctionCount,
                          auctionEndpoint: `/data/wow/connected-realm/${connectedDetail.id}/auctions`
                        };
                        
                        console.log(`🏪 Auction test for ${realm.name}: ${auctionResponse.status} (${auctionCount} auctions)`);
                        break;
                      }
                    }
                  } catch (innerError) {
                    console.log(`Inner error for connected realm lookup: ${innerError.message}`);
                  }
                }
                
                if (!connectedRealmId) {
                  // Still add the realm info even if connected realm lookup fails
                  results.foundRealms[realm.slug || realmName] = {
                    realmId: realm.id,
                    realmName: realm.name,
                    realmSlug: realm.slug,
                    namespace: namespace,
                    error: 'Could not find connected realm ID'
                  };
                }
              }
            } catch (connectedError) {
              console.log(`❌ Connected realm error for ${realm.name}:`, connectedError.message);
              
              results.foundRealms[realm.slug || realmName] = {
                realmId: realm.id,
                realmName: realm.name,
                realmSlug: realm.slug,
                namespace: namespace,
                error: `Connected realm lookup failed: ${connectedError.message}`
              };
            }
          }
        }
        
      } catch (namespaceError) {
        console.log(`❌ Namespace error for ${namespace}:`, namespaceError.message);
        results.errors.push(`Namespace ${namespace} failed: ${namespaceError.message}`);
      }
    }
    
    // Generate config code for the user
    if (Object.keys(results.foundRealms).length > 0) {
      const configMapping = {};
      const displayNames = {
        dreamscythe: 'Dreamscythe (Normal)',
        nightslayer: 'Nightslayer (PvP)',
        doomhowl: 'Doomhowl (Hardcore)',
        thunderstrike: 'Thunderstrike (EU Normal)',
        spineshatter: 'Spineshatter (EU PvP)',
        soulseeker: 'Soulseeker (EU Hardcore)',
        maladath: 'Maladath (Oceanic)'
      };
      
      for (const [slug, realm] of Object.entries(results.foundRealms)) {
        if (realm.connectedRealmId && realm.auctionWorking) {
          configMapping[slug] = {
            connectedRealmId: realm.connectedRealmId,
            namespace: realm.namespace,
            displayName: displayNames[slug] || realm.realmName
          };
        }
      }
      
      results.configCode = `// Add this to your search.js file:
const ANNIVERSARY_REALM_MAPPING = ${JSON.stringify(configMapping, null, 2)};`;
    }
    
    console.log(`✅ Discovery complete. Found ${Object.keys(results.foundRealms).length} Anniversary realms`);
    
    res.status(200).json({
      success: true,
      message: `Found ${Object.keys(results.foundRealms).length} Anniversary realms`,
      ...results
    });
    
  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
