export default async function handler(req, res) {
  try {
    const token = await getBlizzardToken(); // You'll need to copy this function
    
    // Get all connected realms to find Anniversary ones
    const realmsResponse = await fetch(
      `https://us.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-classic1x-us&locale=en_US&access_token=${token}`
    );
    
    const realmsData = await realmsResponse.json();
    
    return res.json({
      status: 'success',
      realmsCount: realmsData.connected_realms?.length || 0,
      sampleRealms: realmsData.connected_realms?.slice(0, 5) || [],
      token: token ? 'Token working' : 'No token'
    });
    
  } catch (error) {
    return res.json({
      error: error.message,
      stack: error.stack
    });
  }
}
