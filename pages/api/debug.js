// pages/api/debug.js
// Anniversary Realm Discovery API

export default async function handler(req, res) {
  try {
    console.log('🔍 Starting Enhanced Anniversary Realm Discovery...');
    
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
      const errorDetails = await tokenResponse.text();
      throw new Error(`Token request failed: ${tokenResponse.status} - ${errorDetails}`);
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
      apiCredentialsValid: true,
      searchedEndpoints: [],
      foundRealms: {},
      allRealms: {},
      errors: [],
      configCode: ''
    };
    
    // Try multiple API endpoints and namespaces
    const endpointsToTry = [
      // US endpoints with different namespaces
      { region: 'us', base: 'https://us.api.blizzard.com', namespaces: [
        'dynamic-classic-us', 'static-classic-us', 'dynamic-us', 'static-us',
        'dynamic-classic-1x-us', 'dynamic-anniversary-us', 'dynamic-fresh-us',
        'static-anniversary-us', 'profile-classic-us', 'dynamic-hardcore-us'
      ]},
      // EU endpoints  
      { region: 'eu', base: 'https://eu.api.blizzard.com', namespaces: [
        'dynamic-classic-eu', 'static-classic-eu', 'dynamic-eu', 'static-eu',
        'dynamic-classic-1x-eu', 'dynamic-anniversary-eu', 'dynamic-fresh-eu'
      ]},
      // Try Korean/Taiwan (sometimes realms appear here first)
      { region: 'kr', base: 'https://kr.api.blizzard.com', namespaces: [
        'dynamic-classic-kr', 'static-classic-kr'
      ]}
    ];
    
    for (const endpoint of endpointsToTry) {
      for (const namespace of endpoint.namespaces) {
        try {
          console.log(`🔍 Checking ${endpoint.region} - ${namespace}`);
          const searchKey = `${endpoint.region}:${namespace}`;
          results.searchedEndpoints.push(searchKey);
          
          // Get realm index
          const realmResponse = await fetch(
            `${endpoint.base}/data/wow/realm/index?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
          );
          
          if (!realmResponse.ok) {
            results.errors.push(`${searchKey} realm index failed: ${realmResponse.status}`);
            
            // Try alternative endpoint structures for Anniversary realms
            if (realmResponse.status === 404) {
              console.log(`Trying alternative structures for ${searchKey}...`);
              
              // Try connected realm endpoint directly
              const connectedResponse = await fetch(
                `${endpoint.base}/data/wow/connected-realm/index?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
              );
              
              if (connectedResponse.ok) {
                console.log(`✅ Connected realm endpoint works for ${searchKey}`);
                const connectedData = await connectedResponse.json();
                
                // Try to get realm details from connected realms
                for (const connectedRealm of (connectedData.connected_realms || []).slice(0, 5)) {
                  try {
                    const detailResponse = await fetch(
                      `${endpoint.base}${connectedRealm.href}?access_token=${accessToken}`
                    );
                    
                    if (detailResponse.ok) {
                      const detailData = await detailResponse.json();
                      
                      // Check if any realms in this connected realm are Anniversary realms
                      for (const realm of detailData.realms || []) {
                        const realmName = realm.name.toLowerCase();
                        const realmSlug = realm.slug?.toLowerCase() || '';
                        
                        const isAnniversary = anniversaryKeywords.some(keyword => 
                          realmName.includes(keyword) || realmSlug.includes(keyword)
                        );
                        
                        if (isAnniversary) {
                          console.log(`🎉 Found Anniversary realm via connected realm: ${realm.name}`);
                          
                          // Test auction access
                          const auctionResponse = await fetch(
                            `${endpoint.base}/data/wow/connected-realm/${detailData.id}/auctions?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
                          );
                          
                          const auctionCount = auctionResponse.ok ? 
                            (await auctionResponse.json()).auctions?.length || 0 : 0;
                          
                          results.foundRealms[realm.slug || realmName] = {
                            realmId: realm.id,
                            realmName: realm.name,
                            realmSlug: realm.slug,
                            connectedRealmId: detailData.id,
                            namespace: namespace,
                            region: endpoint.region,
                            apiBase: endpoint.base,
                            auctionWorking: auctionResponse.ok,
                            auctionStatus: auctionResponse.status,
                            auctionCount: auctionCount,
                            discoveryMethod: 'connected-realm-search'
                          };
                        }
                      }
                    }
                  } catch (innerError) {
                    // Continue to next connected realm
                  }
                }
              }
            }
            continue;
          }
          
          const realmData = await realmResponse.json();
          const realms = realmData.realms || [];
          
          console.log(`Found ${realms.length} realms in ${searchKey}`);
          
          // Store all realms for debugging
          if (!results.allRealms[searchKey]) {
            results.allRealms[searchKey] = [];
          }
          results.allRealms[searchKey] = realms.map(r => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            category: r.category?.name || 'unknown'
          }));
          
          // Search for Anniversary realms in this namespace
          for (const realm of realms) {
            const realmName = realm.name.toLowerCase();
            const realmSlug = realm.slug?.toLowerCase() || '';
            
            const isAnniversary = anniversaryKeywords.some(keyword => 
              realmName.includes(keyword) || realmSlug.includes(keyword)
            );
            
            if (isAnniversary) {
              console.log(`✨ Found Anniversary realm: ${realm.name} (ID: ${realm.id})`);
              
              // Get connected realm info using standard method
              try {
                const connectedRealmResponse = await fetch(
                  `${endpoint.base}/data/wow/connected-realm/index?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
                );
                
                if (connectedRealmResponse.ok) {
                  const connectedData = await connectedRealmResponse.json();
                  
                  // Find which connected realm this realm belongs to
                  for (const connectedRealm of connectedData.connected_realms || []) {
                    try {
                      const connectedDetailResponse = await fetch(
                        `${endpoint.base}${connectedRealm.href}?access_token=${accessToken}`
                      );
                      
                      if (connectedDetailResponse.ok) {
                        const connectedDetail = await connectedDetailResponse.json();
                        
                        const belongsToConnected = connectedDetail.realms?.some(r => 
                          r.id === realm.id || r.slug === realm.slug
                        );
                        
                        if (belongsToConnected) {
                          // Test auction access
                          const auctionResponse = await fetch(
                            `${endpoint.base}/data/wow/connected-realm/${connectedDetail.id}/auctions?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
                          );
                          
                          const auctionCount = auctionResponse.ok ? 
                            (await auctionResponse.json()).auctions?.length || 0 : 0;
                          
                          results.foundRealms[realm.slug || realmName] = {
                            realmId: realm.id,
                            realmName: realm.name,
                            realmSlug: realm.slug,
                            connectedRealmId: connectedDetail.id,
                            namespace: namespace,
                            region: endpoint.region,
                            apiBase: endpoint.base,
                            auctionWorking: auctionResponse.ok,
                            auctionStatus: auctionResponse.status,
                            auctionCount: auctionCount,
                            discoveryMethod: 'standard-realm-search'
                          };
                          
                          console.log(`🏪 Auction test for ${realm.name}: ${auctionResponse.status} (${auctionCount} auctions)`);
                          break;
                        }
                      }
                    } catch (innerError) {
                      console.log(`Inner error: ${innerError.message}`);
                    }
                  }
                }
              } catch (connectedError) {
                console.log(`❌ Connected realm error for ${realm.name}:`, connectedError.message);
                
                // Still record the realm even if we can't get connected realm info
                results.foundRealms[realm.slug || realmName] = {
                  realmId: realm.id,
                  realmName: realm.name,
                  realmSlug: realm.slug,
                  namespace: namespace,
                  region: endpoint.region,
                  apiBase: endpoint.base,
                  error: `Connected realm lookup failed: ${connectedError.message}`,
                  discoveryMethod: 'realm-only'
                };
              }
            }
          }
          
        } catch (namespaceError) {
          console.log(`❌ Error with ${searchKey}:`, namespaceError.message);
          results.errors.push(`${searchKey} failed: ${namespaceError.message}`);
        }
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
            region: realm.region,
            apiBase: realm.apiBase,
            displayName: displayNames[slug] || realm.realmName
          };
        }
      }
      
      results.configCode = `// Add this to your search.js file:
const ANNIVERSARY_REALM_MAPPING = ${JSON.stringify(configMapping, null, 2)};`;
    } else {
      // If no Anniversary realms found, provide debugging info
      const workingEndpoints = Object.keys(results.allRealms).filter(key => 
        results.allRealms[key].length > 0
      );
      
      results.debugInfo = {
        workingEndpoints,
        totalSearched: results.searchedEndpoints.length,
        possibleReasons: [
          'Anniversary realms might use different names than expected',
          'Anniversary realms might be in a different API structure',
          'Anniversary realms might not be available in the API yet',
          'API endpoints might have changed since Anniversary launch'
        ],
        suggestions: [
          'Check all realm names in working endpoints for Anniversary-like names',
          'Look for realms with recent creation dates',
          'Check if Anniversary realms are in profile APIs instead of game data APIs',
          'Try manual realm ID lookup if you know specific realm IDs'
        ]
      };
    }
    
    console.log(`✅ Enhanced discovery complete. Found ${Object.keys(results.foundRealms).length} Anniversary realms`);
    
    res.status(200).json({
      success: Object.keys(results.foundRealms).length > 0,
      message: Object.keys(results.foundRealms).length > 0 ? 
        `Found ${Object.keys(results.foundRealms).length} Anniversary realms` :
        'No Anniversary realms found - see debugInfo for next steps',
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
