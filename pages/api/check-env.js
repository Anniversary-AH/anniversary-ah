// pages/api/check-env.js
// Check if environment variables are set correctly

export default async function handler(req, res) {
  try {
    const clientId = process.env.BLIZZARD_CLIENT_ID;
    const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
    
    const checks = {
      timestamp: new Date().toISOString(),
      clientIdExists: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      clientIdPreview: clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'NOT SET',
      clientSecretExists: !!clientSecret,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientSecretPreview: clientSecret ? `${clientSecret.substring(0, 4)}...${clientSecret.substring(clientSecret.length - 4)}` : 'NOT SET'
    };
    
    const isValid = clientId && clientSecret && clientId.length > 10 && clientSecret.length > 10;
    
    res.status(200).json({
      success: isValid,
      message: isValid ? 'Environment variables look correct' : 'Environment variables missing or invalid',
      checks,
      nextSteps: isValid ? [
        'Environment variables are set correctly',
        'Issue is likely with battle.net app configuration',
        'Check your battle.net app permissions'
      ] : [
        'Set BLIZZARD_CLIENT_ID in Vercel environment variables',
        'Set BLIZZARD_CLIENT_SECRET in Vercel environment variables',
        'Make sure there are no extra spaces or quotes',
        'Redeploy after setting environment variables'
      ]
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error checking environment variables'
    });
  }
}
