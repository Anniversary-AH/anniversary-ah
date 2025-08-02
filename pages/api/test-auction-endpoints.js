// pages/api/test-auction-endpoints.js
// Test EVERY possible auction endpoint for Anniversary realms

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing ALL possible auction endpoints for Anniversary realms...');
    
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
    
    // Test Dreamscythe (we know this realm exists)
    const realmId = 6103;
    const realmName = "Dreamscythe";
    
    const results = {
      timestamp: new Date().toISOString(),
      testedRealm: realmName,
      realmId: realmId,
      tests: []
    };
    
    // ALL possible auction endpoint variations
    const endpointsToTest = [
      // Standard endpoints with different namespaces
      {
        name: "Standard /auctions (dynamic-classic1x-us)",
        url: `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=dynamic-classic1x-us&locale=en_US`
      },
      {
        name: "Standard /auctions (dynamic-classic-us)", 
        url: `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=dynamic-classic-us&locale=en_US`
      },
      {
        name: "Standard /auctions (static-classic1x-us)",
        url: `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=static-classic1x-us&locale=en_US`
      },
      
      // Different auction endpoint paths
      {
        name: "Auction House Index",
        url: `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions/index?namespace=dynamic-classic1x-us&locale=en_US`
      },
      {
        name: "Auction House (no /auctions)",
        url: `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auction-house?namespace=dynamic-classic1x-us&locale=en_US`
      },
      {
        name: "Profile auction endpoint",
        url: `https://us.api.blizzard.com/profile/wow/connected-realm/${realmId}/auctions?namespace=profile-classic-us&locale=en_US`
      },
      
      // Try realm-specific instead of connected-realm
      {
        name: "Realm auctions (not connected-realm)",
        url: `https://us.api.blizzard.com/data/wow/realm/${realmId}/auctions?namespace=dynamic-classic1x-us&locale=en_US`
      },
      
      // Try community API style
      {
        name: "Community API style",
        url: `https://us.api.blizzard.com/wow/auction/data/${realmId}?locale=en_US`
      },
      
      // Try different regions
      {
        name: "EU endpoint (in case realms are there)",
        url: `https://eu.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=dynamic-classic1x-eu&locale=en_US`
      },
      
      // Try without namespace
      {
        name: "No namespace",
        url: `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?locale=en_US`
      }
    ];
    
    // Test each endpoint
    for (const test of endpointsToTest) {
      console.log(`Testing: ${test.name}`);
      
      try {
        const response = await fetch(test.url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
        
        const responseText = await response.text();
        let responseData = null;
        let auctionCount = 0;
        
        try {
          responseData = JSON.parse(responseText);
          auctionCount = responseData.auctions?.length || 0;
        } catch {
          // Response is not JSON
        }
        
        const result = {
          name: test.name,
          url: test.url.replace(accessToken, 'TOKEN_HIDDEN'),
          status: response.status,
          success: response.ok,
          hasJsonResponse: !!responseData,
          auctionCount: auctionCount,
          responseSize: responseText.length,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        if (response.ok && responseData) {
          if (auctionCount > 0) {
            console.log(`🎉 SUCCESS! Found ${auctionCount} auctions in ${test.name}`);
            
            // Get sample auction data
            result.sampleAuctions = responseData.auctions.slice(0, 3).map(auction => ({
              item: auction.item?.name || `ID: ${auction.item?.id}`,
              buyout: auction.buyout,
              bid: auction.bid,
              quantity: auction.quantity
            }));
          } else {
            console.log(`✅ Endpoint works but no auctions: ${test.name}`);
          }
        } else if (!response.ok) {
          result.errorText = responseText.substring(0, 200);
          console.log(`❌ ${test.name}: ${response.status}`);
        }
        
        results.tests.push(result);
        
        // Short delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.tests.push({
          name: test.name,
          url: test.url.replace(accessToken, 'TOKEN_HIDDEN'),
          status: 'error',
          success: false,
          error: error.message
        });
        
        console.log(`💥 ${test.name}: ${error.message}`);
      }
    }
    
    // Analysis
    const workingEndpoints = results.tests.filter(t => t.success);
    const endpointsWithAuctions = results.tests.filter(t => t.auctionCount > 0);
    
    results.summary = {
      totalEndpointsTested: results.tests.length,
      workingEndpoints: workingEndpoints.length,
      endpointsWithAuctions: endpointsWithAuctions.length,
      maxAuctionsFound: Math.max(...results.tests.map(t => t.auctionCount || 0)),
      recommendation: endpointsWithAuctions.length > 0 ?
        `FOUND LIVE AUCTION DATA! Use the endpoint(s) with auctionCount > 0` :
        workingEndpoints.length > 0 ?
          `Found working endpoints but no auction data yet` :
          `No working auction endpoints found - Anniversary realms might use completely different API structure`
    };
    
    // If we found auction data, highlight the working endpoint
    if (endpointsWithAuctions.length > 0) {
      results.workingAuctionEndpoint = endpointsWithAuctions[0];
      results.successMessage = `🎉 BREAKTHROUGH! Found ${endpointsWithAuctions[0].auctionCount} auctions using: ${endpointsWithAuctions[0].name}`;
    }
    
    console.log(`✅ Endpoint test complete. ${endpointsWithAuctions.length} endpoints have auction data`);
    
    res.status(200).json({
      success: endpointsWithAuctions.length > 0,
      message: endpointsWithAuctions.length > 0 ? 
        `Found auction data in ${endpointsWithAuctions.length} endpoint(s)!` :
        `Tested ${results.tests.length} endpoints - no auction data found`,
      ...results
    });
    
  } catch (error) {
    console.error('Auction endpoint test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
