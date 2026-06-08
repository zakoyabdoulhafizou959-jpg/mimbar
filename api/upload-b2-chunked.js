// /api/upload-b2-chunked.js
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Vos credentials Backblaze B2
  const KEY_ID = '786f70c49f56';
  const APP_KEY = '005c94ef9745859295d88e9f04641a1f84e49c13e2';
  const BUCKET_ID = '57e8c67fa7e09c7499ef0516';
  const BUCKET_NAME = 'minbar-media';
  
  try {
    const { fileName, fileSize, contentType } = req.body;
    
    if (!fileName || !fileSize || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('📦 Init chunked upload:', fileName, 'Size:', fileSize);
    
    // 1. Autorisation avec B2
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64')
      }
    });
    
    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();
    
    // 2. Démarrer un large file upload
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
        fileInfo: {
          author: 'mimbar-app',
          uploadMethod: 'chunked'
        }
      })
    });
    
    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      throw new Error(`Start large file failed: ${startResponse.status} - ${errorText}`);
    }
    
    const startData = await startResponse.json();
    
    // 3. Obtenir l'URL pour uploader les parts
    const partResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_part_url`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: startData.fileId
      })
    });
    
    if (!partResponse.ok) {
      throw new Error(`Get upload part URL failed: ${partResponse.status}`);
    }
    
    const partData = await partResponse.json();
    
    // 4. Retourner les infos au frontend
    return res.status(200).json({
      fileId: startData.fileId,
      uploadUrl: partData.uploadUrl,
      authorizationToken: partData.authorizationToken,
      downloadUrl: 'https://f005.backblazeb2.com/file/minbar-media/'
    });
    
  } catch (error) {
    console.error('❌ Erreur upload-b2-chunked:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
