// /api/upload-support.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const KEY_ID = '786f70c49f56';
  const APP_KEY = '005c94ef9745859295d88e9f04641a1f84e49c13e2';
  const BUCKET_ID = '57e8c67fa7e09c7499ef0516';
  
  try {
    console.log('📥 Requête upload-support reçue');
    
    const auth = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { 'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64') }
    });
    
    if (!auth.ok) {
      const errorText = await auth.text();
      console.error('❌ Auth failed:', errorText);
      throw new Error('Auth failed');
    }
    
    const authData = await auth.json();
    console.log('✅ Auth B2 réussie');
    
    const uploadRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bucketId: BUCKET_ID })
    });
    
    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('❌ Get URL failed:', errorText);
      throw new Error('Get URL failed');
    }
    
    const uploadData = await uploadRes.json();
    console.log('✅ Upload URL obtenue');
    
    return res.status(200).json({
      uploadUrl: uploadData.uploadUrl,
      authorizationToken: uploadData.authorizationToken,
      downloadUrl: 'https://f005.backblazeb2.com/file/minbar-media/'
    });
    
  } catch (error) {
    console.error('❌ Erreur upload-support:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
