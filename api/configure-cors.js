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
    // 1. Auth B2
    const auth = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { 'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64') }
    });
    if (!auth.ok) throw new Error('Auth failed: ' + auth.status);
    const authData = await auth.json();
    
    // 2. Configurer CORS (sans b2_hide_file)
    const corsRules = [
      {
        corsRuleName: 'allow-all-operations',
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        allowedOperations: [
          'b2_download_file_by_id',
          'b2_download_file_by_name',
          'b2_upload_file',
          'b2_upload_part'
        ],
        exposeHeaders: ['x-bz-content-sha1', 'x-bz-file-id', 'x-bz-file-name'],
        maxAgeSeconds: 3600
      }
    ];
    
    const updateRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_update_bucket`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId: authData.accountId,
        bucketId: BUCKET_ID,
        corsRules: corsRules
      })
    });
    
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Update failed: ${updateRes.status} - ${errText}`);
    }
    
    const result = await updateRes.json();
    
    return res.status(200).json({
      success: true,
      message: 'CORS configuré avec succès !',
      corsRules: result.corsRules
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
}
