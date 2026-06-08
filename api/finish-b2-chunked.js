export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const KEY_ID = '786f70c49f56';
  const APP_KEY = '005c94ef9745859295d88e9f04641a1f84e49c13e2';
  
  try {
    const { fileId, partShas, fileName } = req.body;
    
    if (!fileId || !partShas) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`✅ Finalisation: ${fileId}, ${partShas.length} parts`);
    
    // 1. Autorisation B2 pour obtenir le token GLOBAL
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64')
      }
    });
    
    if (!authResponse.ok) throw new Error(`Auth failed: ${authResponse.status}`);
    const authData = await authResponse.json();
    
    // 2. Préparer la liste des SHA1
    const parts = partShas.map(p => p.sha1);
    
    // 3. ✅ UTILISER LE TOKEN GLOBAL (authData.authorizationToken)
    const finishResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_finish_large_file`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,  // ← Token GLOBAL, pas celui du large file
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: fileId,
        partSha1Array: parts
      })
    });
    
    if (!finishResponse.ok) {
      const errorText = await finishResponse.text();
      console.error('❌ Finish error:', errorText);
      throw new Error(`Finish failed: ${finishResponse.status} - ${errorText}`);
    }
    
    const finishData = await finishResponse.json();
    
    console.log('✅ Upload terminé:', finishData.fileName);
    
    return res.status(200).json({
      success: true,
      fileId: finishData.fileId,
      fileName: finishData.fileName,
      size: finishData.contentLength,
      downloadUrl: `https://f005.backblazeb2.com/file/minbar-media/${encodeURIComponent(finishData.fileName)}`
    });
    
  } catch (error) {
    console.error('❌ Erreur finish-b2-chunked:', error);
    return res.status(500).json({ error: error.message });
  }
}
