// pages/api/test-discovery.js
// Simple test to verify parameter reading and basic discovery

export default async function handler(req, res) {
  try {
    console.log('🔍 Discovery test starting...');
    console.log('Query parameters:', req.query);
    
    const { discover, q } = req.query;
    
    // Test parameter reading
    const parameterTest = {
      discoverParam: discover,
      discoverType: typeof discover,
      discoverExists: !!discover,
      discoverEqualsTrue: discover === 'true',
      qParam: q,
      allParams: req.query
    };
    
    console.log('Parameter test:', parameterTest);
    
    // If not discovery mode, return parameter info
    if (discover !== 'true') {
      return res.status(200).json({
        success: false,
        message: 'Not in discovery mode',
        parameterTest,
        instructions: 'Add ?discover=true to URL'
      });
    }
    
    // Discovery mode - get token and test one realm
    console.log('✅ Discovery mode activated');
    
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
    
    console.log('✅ Got access token');
    
    // Test the first few realm IDs
    const testRealmIds = [4372, 4373, 4374];
    const testResults = [];
    
    for (const realmId of testRealmIds) {
      console.log(`Testing realm ID: ${realmId}`);
      
      try {
        // Get realm details
        const realmResponse = await fetch(
          `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}?namespace=dynamic-classic-us&locale=en_US&access_token=${accessToken}`
        );
        
        if (realmResponse.ok) {
          const realmData = await realmResponse.json();
          console.log(`✅ Realm ${realmId} exists:`, realmData.realms?.map(r => r.name));
          
          // Check for Anniversary realm names
          const anniversaryKeywords = ['dreamscythe', 'nightslayer', 'doomhowl', 'thunderstrike', 'spineshatter', 'soulseeker', 'maladath'];
          
          for (const realm of realmData.realms || []) {
            const realmName = realm.name.toLowerCase();
            const realmSlug = realm.slug?.toLowerCase() || '';
            
            const isAnniversary = anniversaryKeywords.some(keyword => 
              realmName.includes(keyword) || realmSlug.includes(keyword)
            );
            
            if (isAnniversary) {
              console.log(`🎉 FOUND Anniversary realm: ${realm.name}`);
              
              // Test auctions
              const auctionResponse = await fetch(
                `https://us.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=dynamic-classic-us&locale=en_US&access_token=${accessToken}`
              );
              
              const auctionCount = auctionResponse.ok ? 
                (await auctionResponse.json()).auctions?.length || 0 : 0;
              
              testResults.push({
                connectedRealmId: realmId,
                realmName: realm.name,
                realmSlug: realm.slug,
                auctionsWorking: auctionResponse.ok,
                auctionCount: auctionCount,
                auctionStatus: auctionResponse.status
              });
            }
          }
        } else {
          console.log(`❌ Realm ${realmId} failed: ${realmResponse.status}`);
        }
      } catch (error) {
        console.log(`❌ Realm ${realmId} error:`, error.message);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Discovery test complete',
      parameterTest,
      tokenGenerated: true,
      testedRealmIds: testRealmIds,
      foundAnniversaryRealms: testResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Discovery test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
