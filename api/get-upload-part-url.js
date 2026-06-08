// /api/get-upload-part-url.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const KEY_ID = '786f70c49f56';
  const APP_KEY = '005c94ef9745859295d88e9f04641a1f84e49c13e2';
  
  try {
    const { fileId, authorizationToken } = req.body;
    
    if (!fileId || !authorizationToken) {
      return res.status(400).json({ error: 'Missing fileId or authorizationToken' });
    }
    
    // 1. Autorisation B2
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64')
      }
    });
    
    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();
    
    // 2. Obtenir une NOUVELLE URL d'upload pour une part
    const partResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_part_url`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: fileId
      })
    });
    
    if (!partResponse.ok) {
      const errorText = await partResponse.text();
      throw new Error(`Get upload part URL failed: ${partResponse.status} - ${errorText}`);
    }
    
    const partData = await partResponse.json();
    
    return res.status(200).json({
      uploadUrl: partData.uploadUrl,
      authorizationToken: partData.authorizationToken
    });
    
  } catch (error) {
    console.error('❌ Erreur get-upload-part-url:', error);
    return res.status(500).json({ error: error.message });
  }
}
