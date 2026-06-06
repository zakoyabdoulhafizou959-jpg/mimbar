// api/get-upload-url.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const B2_KEY_ID = '786f70c49f56';
    const B2_APPLICATION_KEY = '005c94ef9745859295d88e9f04641a1f84e49c13e2';
    const B2_BUCKET_ID = '57e8c67fa7e09c7499ef0516';
    
    try {
        // 1. Auth B2
        const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64')
            }
        });
        
        if (!authResponse.ok) throw new Error('Auth B2 échouée: ' + authResponse.status);
        const authData = await authResponse.json();
        
        // 2. Get upload URL
        const uploadUrlResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: 'POST',
            headers: {
                'Authorization': authData.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bucketId: B2_BUCKET_ID })
        });
        
        if (!uploadUrlResponse.ok) throw new Error('Get upload URL échoué');
        const uploadData = await uploadUrlResponse.json();
        
        return res.status(200).json({
            uploadUrl: uploadData.uploadUrl,
            authorizationToken: uploadData.authorizationToken,
            downloadUrl: 'https://f005.backblazeb2.com/file/minbar-media/'
        });
        
    } catch (error) {
        console.error('Erreur:', error);
        return res.status(500).json({ error: error.message });
    }
}
