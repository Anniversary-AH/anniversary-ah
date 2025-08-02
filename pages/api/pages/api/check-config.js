// pages/api/check-config.js
// Check what realm configuration is currently deployed

export default async function handler(req, res) {
  try {
    // MANUAL realm mapping - this should definitely work
    const ANNIVERSARY_REALM_MAPPING = {
      "dreamscythe": {
        "connectedRealmId": 6103,
        "namespace": "dynamic-classic1x-us",
        "displayName": "Dreamscythe (Normal)"
      },
      "nightslayer": {
        "connectedRealmId": 6104,
        "namespace": "dynamic-classic1x-us",
        "displayName": "Nightslayer (PvP)"
      },
      "doomhowl": {
        "connectedRealmId": 6105,
        "namespace": "dynamic-classic1x-us",
        "displayName": "Doomhowl (Hardcore)"
      },
      "maladath": {
        "connectedRealmId": 6131,
        "namespace": "dynamic-classic1x-us",
        "displayName": "Maladath (Oceanic)"
      }
    };
    
    // Check configuration
    const configuredRealms = Object.entries(ANNIVERSARY_REALM_MAPPING)
      .filter(([_, config]) => config.connectedRealmId !== null);
    
    // Test access token generation
    let tokenTest = null;
    try {
      const tokenResponse = await fetch('https://oauth.battle.net/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
      });
      
      tokenTest = {
        status: tokenResponse.status,
        success: tokenResponse.ok
      };
    } catch (error) {
      tokenTest = {
        status: 'error',
        error: error.message
      };
    }
    
    // Test one realm API call
    let realmTest = null;
    if (tokenTest.success) {
      try {
        const tokenData = await fetch('https://oauth.battle.net/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
          },
          body: 'grant_type=client_credentials'
        }).then(r => r.json());
        
        const testResponse = await fetch(
          `https://us.api.blizzard.com/data/wow/connected-realm/6103?namespace=dynamic-classic1x-us&locale=en_US`,
          {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/json'
            }
          }
        );
        
        realmTest = {
          realmId: 6103,
          status: testResponse.status,
          success: testResponse.ok
        };
        
        if (testResponse.ok) {
          const realmData = await testResponse.json();
          realmTest.realmName = realmData.realms?.[0]?.name;
        }
      } catch (error) {
        realmTest = {
          realmId: 6103,
          status: 'error',
          error: error.message
        };
      }
    }
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      currentConfig: {
        realmMapping: ANNIVERSARY_REALM_MAPPING,
        configuredRealmCount: configuredRealms.length,
        configuredRealmKeys: configuredRealms.map(([key]) => key)
      },
      tests: {
        tokenGeneration: tokenTest,
        realmApiCall: realmTest
      },
      diagnosis: {
        configurationWorking: configuredRealms.length > 0,
        apiAccessWorking: tokenTest?.success && realmTest?.success,
        recommendation: configuredRealms.length === 0 ? 
          'Realm mapping is not configured properly' :
          !tokenTest?.success ? 
            'API credentials issue' :
            !realmTest?.success ?
              'Realm API calls failing' :
              'Everything should be working!'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
