// /api/finish-b2-chunked.js
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
  
  try {
    const { fileId, authorizationToken, partShas, fileName } = req.body;
    
    if (!fileId || !authorizationToken || !partShas || !Array.isArray(partShas)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`✅ Finalisation upload: ${fileId}, ${partShas.length} parts`);
    
    // 1. Autorisation avec B2 (pour avoir l'API URL)
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64')
      }
    });
    
    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();
    
    // 2. Préparer la liste des parts
    const parts = partShas.map(part => ({
      partNumber: part.partNumber,
      sha1: part.sha1
    }));
    
    // 3. Finaliser le large file
    const finishResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_finish_large_file`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: fileId,
        partSha1Array: parts.map(p => p.sha1)
      })
    });
    
    if (!finishResponse.ok) {
      const errorText = await finishResponse.text();
      throw new Error(`Finish large file failed: ${finishResponse.status} - ${errorText}`);
    }
    
    const finishData = await finishResponse.json();
    
    console.log('✅ Upload terminé avec succès:', finishData.fileName);
    
    // 4. Retourner les infos du fichier finalisé
    return res.status(200).json({
      success: true,
      fileId: finishData.fileId,
      fileName: finishData.fileName,
      contentType: finishData.contentType,
      size: finishData.contentLength,
      downloadUrl: `https://f005.backblazeb2.com/file/minbar-media/${encodeURIComponent(finishData.fileName)}`
    });
    
  } catch (error) {
    console.error('❌ Erreur finish-b2-chunked:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
