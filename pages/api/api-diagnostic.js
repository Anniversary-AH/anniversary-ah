// pages/api/api-diagnostic.js
// Comprehensive Blizzard API diagnostic tool

export default async function handler(req, res) {
  try {
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
    
    console.log('✅ Token generated, testing multiple API endpoints...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tokenGenerated: true,
      tests: []
    };
    
    // Test different API endpoints and structures
    const endpointsToTest = [
      // Current API structure
      {
        name: 'US Retail Realms (Current)',
        url: `https://us.api.blizzard.com/data/wow/realm/index?namespace=dynamic-us&locale=en_US&access_token=${accessToken}`
      },
      {
        name: 'US Classic Realms (Current)', 
        url: `https://us.api.blizzard.com/data/wow/realm/index?namespace=dynamic-classic-us&locale=en_US&access_token=${accessToken}`
      },
      {
        name: 'US Connected Realms (Current)',
        url: `https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-us&locale=en_US&access_token=${accessToken}`
      },
      {
        name: 'US Classic Connected Realms',
        url: `https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-classic-us&locale=en_US&access_token=${accessToken}`
      },
      
      // Alternative API paths
      {
        name: 'Community API - Realms',
        url: `https://us.api.blizzard.com/wow/realm/status?locale=en_US&access_token=${accessToken}`
      },
      {
        name: 'Profile API Test',
        url: `https://us.api.blizzard.com/profile/wow/realm/index?namespace=profile-us&locale=en_US&access_token=${accessToken}`
      },
      
      // Try different regions
      {
        name: 'EU API Test',
        url: `https://eu.api.blizzard.com/data/wow/realm/index?namespace=dynamic-eu&locale=en_US&access_token=${accessToken}`
      },
      
      // Try different WoW game versions
      {
        name: 'Classic Era Realms',
        url: `https://us.api.blizzard.com/data/wow/realm/index?namespace=static-classic-us&locale=en_US&access_token=${accessToken}`
      },
      
      // Try without namespace (older API style)
      {
        name: 'No Namespace Test',
        url: `https://us.api.blizzard.com/data/wow/realm/index?locale=en_US&access_token=${accessToken}`
      },
      
      // Try basic wow data
      {
        name: 'WoW Classes (Basic Data)',
        url: `https://us.api.blizzard.com/data/wow/playable-class/index?namespace=static-us&locale=en_US&access_token=${accessToken}`
      },
      {
        name: 'WoW Classic Classes',
        url: `https://us.api.blizzard.com/data/wow/playable-class/index?namespace=static-classic-us&locale=en_US&access_token=${accessToken}`
      },
      
      // Try Diablo or other games (to test if WoW is the issue)
      {
        name: 'Diablo 4 Test',
        url: `https://us.api.blizzard.com/data/d4/season/index?locale=en_US&access_token=${accessToken}`
      },
      {
        name: 'Hearthstone Test',
        url: `https://us.api.blizzard.com/hearthstone/cards?locale=en_US&access_token=${accessToken}`
      }
    ];
    
    // Test each endpoint
    for (const test of endpointsToTest) {
      console.log(`Testing: ${test.name}`);
      
      try {
        const testResponse = await fetch(test.url, {
          headers: {
            'User-Agent': 'Anniversary-AH-Tracker/1.0'
          }
        });
        
        const responseText = await testResponse.text();
        let responseData = null;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          // Response is not JSON
        }
        
        const result = {
          name: test.name,
          url: test.url.replace(accessToken, 'TOKEN_HIDDEN'),
          status: testResponse.status,
          success: testResponse.ok,
          headers: Object.fromEntries(testResponse.headers.entries()),
          hasData: !!responseData,
          dataSize: responseText.length
        };
        
        if (testResponse.ok && responseData) {
          // Extract useful info without exposing full response
          if (responseData.realms) {
            result.realmCount = responseData.realms.length;
            result.sampleRealmNames = responseData.realms.slice(0, 3).map(r => r.name);
          }
          if (responseData.connected_realms) {
            result.connectedRealmCount = responseData.connected_realms.length;
          }
          if (responseData.character_classes) {
            result.classCount = responseData.character_classes.length;
          }
          if (responseData.cards) {
            result.cardCount = responseData.cards.length;
          }
        } else if (!testResponse.ok) {
          result.errorText = responseText.substring(0, 200); // First 200 chars of error
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
      }
    }
    
    // Analysis
    const successfulTests = results.tests.filter(t => t.success);
    const workingEndpoints = successfulTests.length;
    
    results.summary = {
      totalTests: results.tests.length,
      workingEndpoints,
      successRate: `${Math.round((workingEndpoints / results.tests.length) * 100)}%`,
      workingApis: successfulTests.map(t => t.name),
      recommendations: []
    };
    
    if (workingEndpoints === 0) {
      results.summary.recommendations = [
        'No APIs are working - possible API access restriction',
        'Check if your battle.net app is enabled for WoW APIs',
        'Verify your battle.net app region settings',
        'Check if Blizzard APIs are experiencing downtime'
      ];
    } else if (successfulTests.some(t => t.name.includes('Classic'))) {
      results.summary.recommendations = [
        'Some Classic APIs are working!',
        'Anniversary realms might be in working Classic endpoints',
        'Focus on working endpoints to find realm data'
      ];
    } else if (successfulTests.some(t => t.realmCount > 0)) {
      results.summary.recommendations = [
        'Retail WoW APIs are working',
        'Classic APIs might be disabled or in different endpoints',
        'Try manual realm ID testing'
      ];
    }
    
    console.log(`✅ Diagnostic complete. ${workingEndpoints}/${results.tests.length} endpoints working`);
    
    res.status(200).json({
      success: workingEndpoints > 0,
      message: workingEndpoints > 0 ? 
        `${workingEndpoints} API endpoints are working` : 
        'No API endpoints are responding correctly',
      ...results
    });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
