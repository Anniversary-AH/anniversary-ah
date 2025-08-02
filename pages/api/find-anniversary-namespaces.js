// pages/api/find-anniversary-namespaces.js
// Search ALL possible namespaces for Anniversary realms

export default async function handler(req, res) {
  try {
    console.log('🔍 Searching ALL possible namespaces for Anniversary realms...');
    
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
    
    // Test ALL possible namespace combinations for Anniversary realms
    const namespacesToTest = [
      // Classic variations
      'dynamic-classic-us', 'static-classic-us',
      'dynamic-classic-eu', 'static-classic-eu',
      'dynamic-classic-kr', 'static-classic-kr',
      
      // Anniversary-specific possibilities
      'dynamic-anniversary-us', 'static-anniversary-us',
      'dynamic-fresh-us', 'static-fresh-us',
      'dynamic-classic-fresh-us', 'static-classic-fresh-us',
      'dynamic-classic-anniversary-us', 'static-classic-anniversary-us',
      'dynamic-classic-2024-us', 'static-classic-2024-us',
      'dynamic-classic-20th-us', 'static-classic-20th-us',
      
      // Different versioning
      'dynamic-classic1x-us', 'static-classic1x-us',
      'dynamic-vanilla-us', 'static-vanilla-us',
      'dynamic-hardcore-us', 'static-hardcore-us',
      
      // Profile namespaces
      'profile-classic-us', 'profile-anniversary-us',
      'profile-fresh-us', 'profile-classic-fresh-us'
    ];
    
    const endpointsToTest = [
      { region: 'us', base: 'https://us.api.blizzard.com' },
      { region: 'eu', base: 'https://eu.api.blizzard.com' },
      { region: 'kr', base: 'https://kr.api.blizzard.com' },
      { region: 'tw', base: 'https://tw.api.blizzard.com' }
    ];
    
    const results = {
      timestamp: new Date().toISOString(),
      testedCombinations: 0,
      workingNamespaces: [],
      allFoundRealms: [],
      anniversaryRealms: [],
      summary: {}
    };
    
    // Test each region + namespace combination
    for (const endpoint of endpointsToTest) {
      for (const namespace of namespacesToTest) {
        const combination = `${endpoint.region}:${namespace}`;
        results.testedCombinations++;
        
        try {
          console.log(`Testing ${combination}...`);
          
          // Test connected realm index
          const indexResponse = await fetch(
            `${endpoint.base}/data/wow/connected-realm/index?namespace=${namespace}&locale=en_US`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
              }
            }
          );
          
          if (indexResponse.ok) {
            const indexData = await indexResponse.json();
            const connectedRealms = indexData.connected_realms || [];
            
            if (connectedRealms.length > 0) {
              console.log(`✅ ${combination}: Found ${connectedRealms.length} connected realms`);
              
              results.workingNamespaces.push({
                region: endpoint.region,
                namespace: namespace,
                endpoint: endpoint.base,
                connectedRealmCount: connectedRealms.length
              });
              
              // Test first few realms for Anniversary names
              for (const connectedRealm of connectedRealms.slice(0, 5)) {
                try {
                  const realmId = connectedRealm.href.match(/\/(\d+)\?/)?.[1];
                  if (!realmId) continue;
                  
                  const realmResponse = await fetch(
                    `${endpoint.base}/data/wow/connected-realm/${realmId}?namespace=${namespace}&locale=en_US`,
                    {
                      headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                      }
                    }
                  );
                  
                  if (realmResponse.ok) {
                    const realmData = await realmResponse.json();
                    
                    for (const realm of realmData.realms || []) {
                      const realmInfo = {
                        name: realm.name,
                        slug: realm.slug,
                        connectedRealmId: parseInt(realmId),
                        namespace: namespace,
                        region: endpoint.region,
                        endpoint: endpoint.base
                      };
                      
                      results.allFoundRealms.push(realmInfo);
                      
                      // Check for Anniversary realm names
                      const realmName = realm.name.toLowerCase();
                      const realmSlug = realm.slug?.toLowerCase() || '';
                      
                      const anniversaryKeywords = [
                        'dreamscythe', 'nightslayer', 'doomhowl', 
                        'thunderstrike', 'spineshatter', 'soulseeker', 'maladath'
                      ];
                      
                      const isAnniversary = anniversaryKeywords.some(keyword => 
                        realmName.includes(keyword) || realmSlug.includes(keyword)
                      );
                      
                      if (isAnniversary) {
                        console.log(`🎉 FOUND Anniversary realm: ${realm.name} in ${combination}`);
                        
                        // Test auctions
                        const auctionResponse = await fetch(
                          `${endpoint.base}/data/wow/connected-realm/${realmId}/auctions?namespace=${namespace}&locale=en_US`,
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
                          auctionCount: auctionCount
                        });
                      }
                    }
                  }
                } catch (realmError) {
                  // Continue to next realm
                }
              }
            }
          }
        } catch (error) {
          // Continue to next combination
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Generate summary
    results.summary = {
      totalCombinationsTested: results.testedCombinations,
      workingNamespaces: results.workingNamespaces.length,
      totalRealmsFound: results.allFoundRealms.length,
      anniversaryRealmsFound: results.anniversaryRealms.length,
      uniqueRealmNames: [...new Set(results.allFoundRealms.map(r => r.name))].sort(),
      recommendation: results.anniversaryRealms.length > 0 ?
        'Found Anniversary realms in working namespaces!' :
        'No Anniversary realms found. They might not be in public API yet or use completely different names.'
    };
    
    console.log(`✅ Comprehensive search complete. Tested ${results.testedCombinations} combinations, found ${results.anniversaryRealms.length} Anniversary realms`);
    
    res.status(200).json({
      success: results.anniversaryRealms.length > 0,
      message: `Tested ${results.testedCombinations} namespace combinations, found ${results.anniversaryRealms.length} Anniversary realms`,
      ...results
    });
    
  } catch (error) {
    console.error('Comprehensive search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
