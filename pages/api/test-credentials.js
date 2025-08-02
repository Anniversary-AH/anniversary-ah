// pages/api/test-credentials.js
// Test basic Blizzard API access

export default async function handler(req, res) {
  try {
    console.log('🔑 Testing Blizzard API credentials...');
    
    // Step 1: Test token generation
    console.log('Testing token generation...');
    const tokenResponse = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    console.log(`Token response status: ${tokenResponse.status}`);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(500).json({
        success: false,
        error: 'Token generation failed',
        status: tokenResponse.status,
        details: errorText,
        checkList: [
          'Verify BLIZZARD_CLIENT_ID is set correctly',
          'Verify BLIZZARD_CLIENT_SECRET is set correctly', 
          'Check if API app is enabled on battle.net'
        ]
      });
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Token generated successfully');
    
    // Step 2: Test basic API endpoints
    const accessToken = tokenData.access_token;
    const tests = [];
    
    // Test 1: Try US retail realms (should always work)
    console.log('Testing US retail realms...');
    try {
      const retailResponse = await fetch(
        `https://us.api.blizzard.com/data/wow/realm/index?namespace=dynamic-us&locale=en_US&access_token=${accessToken}`
      );
      tests.push({
        test: 'US Retail Realms',
        url: 'dynamic-us namespace',
        status: retailResponse.status,
        success: retailResponse.ok,
        realmCount: retailResponse.ok ? (await retailResponse.json()).realms?.length : 0
      });
    } catch (error) {
      tests.push({
        test: 'US Retail Realms',
        url: 'dynamic-us namespace',
        status: 'error',
        success: false,
        error: error.message
      });
    }
    
    // Test 2: Try Classic realms
    console.log('Testing Classic realms...');
    try {
      const classicResponse = await fetch(
        `https://us.api.blizzard.com/data/wow/realm/index?namespace=dynamic-classic-us&locale=en_US&access_token=${accessToken}`
      );
      tests.push({
        test: 'US Classic Realms',
        url: 'dynamic-classic-us namespace',
        status: classicResponse.status,
        success: classicResponse.ok,
        realmCount: classicResponse.ok ? (await classicResponse.json()).realms?.length : 0
      });
    } catch (error) {
      tests.push({
        test: 'US Classic Realms', 
        url: 'dynamic-classic-us namespace',
        status: 'error',
        success: false,
        error: error.message
      });
    }
    
    // Test 3: Try different base URLs
    console.log('Testing EU endpoint...');
    try {
      const euResponse = await fetch(
        `https://eu.api.blizzard.com/data/wow/realm/index?namespace=dynamic-classic-eu&locale=en_US&access_token=${accessToken}`
      );
      tests.push({
        test: 'EU Classic Realms',
        url: 'EU endpoint + dynamic-classic-eu',
        status: euResponse.status,
        success: euResponse.ok,
        realmCount: euResponse.ok ? (await euResponse.json()).realms?.length : 0
      });
    } catch (error) {
      tests.push({
        test: 'EU Classic Realms',
        url: 'EU endpoint + dynamic-classic-eu', 
        status: 'error',
        success: false,
        error: error.message
      });
    }
    
    // Step 3: Try to find Anniversary-specific namespaces
    console.log('Testing potential Anniversary namespaces...');
    const anniversaryNamespaces = [
      'dynamic-classic-1x-us',
      'dynamic-anniversary-us',
      'dynamic-fresh-us',
      'static-anniversary-us',
      'profile-classic-us',
      'dynamic-hardcore-us'
    ];
    
    for (const namespace of anniversaryNamespaces) {
      try {
        const response = await fetch(
          `https://us.api.blizzard.com/data/wow/realm/index?namespace=${namespace}&locale=en_US&access_token=${accessToken}`
        );
        tests.push({
          test: `Anniversary Test: ${namespace}`,
          url: namespace,
          status: response.status,
          success: response.ok,
          realmCount: response.ok ? (await response.json()).realms?.length : 0
        });
      } catch (error) {
        tests.push({
          test: `Anniversary Test: ${namespace}`,
          url: namespace,
          status: 'error', 
          success: false,
          error: error.message
        });
      }
    }
    
    // Analysis
    const successfulTests = tests.filter(t => t.success);
    const apiWorking = successfulTests.length > 0;
    
    res.status(200).json({
      success: apiWorking,
      timestamp: new Date().toISOString(),
      tokenGenerated: true,
      apiCredentialsValid: apiWorking,
      tests: tests,
      analysis: {
        workingEndpoints: successfulTests.length,
        totalTests: tests.length,
        recommendation: apiWorking ? 
          'API credentials work! Anniversary realms might be in a different namespace.' :
          'API credentials or endpoints may be invalid. Check your battle.net app settings.'
      },
      nextSteps: apiWorking ? [
        'Anniversary realms might use different namespace naming',
        'Try searching with different keywords',
        'Check if Anniversary realms are in profile APIs instead of game data APIs'
      ] : [
        'Verify BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET in Vercel environment',
        'Check if your battle.net app has WoW API access enabled',
        'Verify the app is not restricted to specific regions'
      ]
    });
    
  } catch (error) {
    console.error('Credential test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
