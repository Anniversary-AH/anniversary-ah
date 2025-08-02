// pages/api/exact-test.js
// Test the EXACT same endpoint that worked in API documentation

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing EXACT endpoint that worked in API documentation...');
    
    // Get access token (same as before)
    const tokenResponse = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token failed: ${tokenResponse.status} - ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('✅ Got access token');
    
    const results = {
      timestamp: new Date().toISOString(),
      tokenGenerated: true,
      tests: []
    };
    
    // Test the EXACT endpoint that worked in the documentation
    const exactUrl = `https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-classic-us&locale=en_US&access_token=${accessToken}`;
    
    console.log('Testing exact URL from documentation...');
    console.log('URL (token hidden):', exactUrl.replace(accessToken, 'TOKEN_HIDDEN'));
    
    const exactTest = await fetch(exactUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Anniversary-AH-Tracker/1.0',
        'Accept': 'application/json'
      }
    });
    
    const exactResponseText = await exactTest.text();
    let exactResponseData = null;
    
    try {
      exactResponseData = JSON.parse(exactResponseText);
    } catch {
      // Response is not JSON
    }
    
    results.tests.push({
      name: 'Exact Documentation URL',
      url: exactUrl.replace(accessToken, 'TOKEN_HIDDEN'),
      status: exactTest.status,
      success: exactTest.ok,
      headers: Object.fromEntries(exactTest.headers.entries()),
      responseLength: exactResponseText.length,
      hasJsonResponse: !!exactResponseData,
      connectedRealmCount: exactResponseData?.connected_realms?.length || 0,
      errorText: !exactTest.ok ? exactResponseText.substring(0, 200) : null
    });
    
    // Try with Authorization header instead of query parameter
    console.log('Testing with Authorization header...');
    
    const headerTest = await fetch(
      'https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-classic-us&locale=en_US',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Anniversary-AH-Tracker/1.0',
          'Accept': 'application/json'
        }
      }
    );
    
    const headerResponseText = await headerTest.text();
    let headerResponseData = null;
    
    try {
      headerResponseData = JSON.parse(headerResponseText);
    } catch {
      // Response is not JSON
    }
    
    results.tests.push({
      name: 'Authorization Header Method',
      url: 'https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-classic-us&locale=en_US',
      status: headerTest.status,
      success: headerTest.ok,
      headers: Object.fromEntries(headerTest.headers.entries()),
      responseLength: headerResponseText.length,
      hasJsonResponse: !!headerResponseData,
      connectedRealmCount: headerResponseData?.connected_realms?.length || 0,
      errorText: !headerTest.ok ? headerResponseText.substring(0, 200) : null
    });
    
    // If one method works, use it to test specific realm
    if (headerTest.ok && headerResponseData?.connected_realms?.length > 0) {
      console.log('✅ Authorization header method works! Testing specific realm...');
      
      const firstRealmId = headerResponseData.connected_realms[0].href.match(/\/(\d+)\?/)?.[1];
      
      if (firstRealmId) {
        const realmTest = await fetch(
          `https://us.api.blizzard.com/data/wow/connected-realm/${firstRealmId}?namespace=dynamic-classic-us&locale=en_US`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'Anniversary-AH-Tracker/1.0',
              'Accept': 'application/json'
            }
          }
        );
        
        if (realmTest.ok) {
          const realmData = await realmTest.json();
          
          results.tests.push({
            name: 'Specific Realm Test',
            realmId: firstRealmId,
            status: realmTest.status,
            success: true,
            realmNames: realmData.realms?.map(r => r.name) || [],
            realmCount: realmData.realms?.length || 0
          });
        }
      }
    }
    
    // Summary
    const workingTests = results.tests.filter(t => t.success);
    
    results.summary = {
      totalTests: results.tests.length,
      workingTests: workingTests.length,
      recommendation: workingTests.length > 0 ?
        'Found working method! Use Authorization header instead of query parameter.' :
        'No methods working. Check API status or token permissions.'
    };
    
    // If we found connected realms, include them
    const workingRealmTest = workingTests.find(t => t.connectedRealmCount > 0);
    if (workingRealmTest) {
      results.workingMethod = 'Authorization header';
      results.connectedRealmCount = workingRealmTest.connectedRealmCount;
    }
    
    console.log(`✅ Test complete. ${workingTests.length}/${results.tests.length} methods working`);
    
    res.status(200).json({
      success: workingTests.length > 0,
      message: workingTests.length > 0 ? 
        `Found working API access method!` : 
        'No API methods working',
      ...results
    });
    
  } catch (error) {
    console.error('Exact test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
