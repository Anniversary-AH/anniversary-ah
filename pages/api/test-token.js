// pages/api/test-token.js
// Test basic token generation

export default async function handler(req, res) {
  try {
    const clientId = process.env.BLIZZARD_CLIENT_ID;
    const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Missing environment variables',
        missing: {
          clientId: !clientId,
          clientSecret: !clientSecret
        },
        instructions: [
          'Go to Vercel Dashboard > Your Project > Settings > Environment Variables',
          'Add BLIZZARD_CLIENT_ID with your battle.net app Client ID',
          'Add BLIZZARD_CLIENT_SECRET with your battle.net app Client Secret',
          'Redeploy your application'
        ]
      });
    }
    
    console.log('🔑 Testing token generation...');
    console.log(`Client ID length: ${clientId.length}`);
    console.log(`Client Secret length: ${clientSecret.length}`);
    
    // Create the Basic Auth header
    const authString = `${clientId}:${clientSecret}`;
    const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;
    
    console.log(`Auth header created: ${authHeader.substring(0, 20)}...`);
    
    // Test token request
    const tokenResponse = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: 'grant_type=client_credentials'
    });
    
    console.log(`Token response status: ${tokenResponse.status}`);
    console.log(`Token response headers:`, Object.fromEntries(tokenResponse.headers.entries()));
    
    const responseText = await tokenResponse.text();
    console.log(`Token response body: ${responseText}`);
    
    if (!tokenResponse.ok) {
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch {
        errorDetails = responseText;
      }
      
      return res.status(tokenResponse.status).json({
        success: false,
        error: 'Token generation failed',
        status: tokenResponse.status,
        details: errorDetails,
        troubleshooting: {
          401: 'Invalid Client ID or Client Secret - check your battle.net app credentials',
          403: 'API access denied - check your battle.net app permissions',
          400: 'Bad request format - check if credentials have special characters'
        }[tokenResponse.status] || 'Unknown error - check battle.net API status'
      });
    }
    
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Invalid JSON response from token endpoint',
        responseText
      });
    }
    
    // Test a simple API call with the token
    console.log('✅ Token generated, testing API call...');
    
    const testResponse = await fetch(
      `https://us.api.blizzard.com/data/wow/realm/index?namespace=dynamic-us&locale=en_US&access_token=${tokenData.access_token}`
    );
    
    console.log(`API test status: ${testResponse.status}`);
    
    const apiTestResult = {
      status: testResponse.status,
      success: testResponse.ok,
      headers: Object.fromEntries(testResponse.headers.entries())
    };
    
    if (testResponse.ok) {
      const apiData = await testResponse.json();
      apiTestResult.realmCount = apiData.realms?.length || 0;
    } else {
      apiTestResult.errorText = await testResponse.text();
    }
    
    res.status(200).json({
      success: true,
      message: 'Token generation successful',
      tokenGenerated: true,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      apiTest: apiTestResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Token test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
