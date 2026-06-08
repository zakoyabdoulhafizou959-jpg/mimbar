export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const KEY_ID = '786f70c49f56';
  const APP_KEY = '005c94ef9745859295d88e9f04641a1f84e49c13e2';
  const BUCKET_ID = '57e8c67fa7e09c7499ef0516';
  
  try {
    const { fileName, fileSize, contentType } = req.body;
    
    if (!fileName || !fileSize || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('📦 Init chunked upload:', fileName, 'Size:', fileSize);
    
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64')
      }
    });
    
    if (!authResponse.ok) throw new Error(`Auth failed: ${authResponse.status}`);
    const authData = await authResponse.json();
    
    const startResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_start_large_file`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: BUCKET_ID,
        fileName: fileName,
        contentType: contentType,
        fileInfo: { author: 'mimbar-app', uploadMethod: 'chunked' }
      })
    });
    
    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      throw new Error(`Start large file failed: ${startResponse.status} - ${errorText}`);
    }
    
    const startData = await startResponse.json();
    
    return res.status(200).json({
      fileId: startData.fileId,
      authorizationToken: authData.authorizationToken
    });
    
  } catch (error) {
    console.error('❌ Erreur upload-b2-chunked:', error);
    return res.status(500).json({ error: error.message });
  }
}
