// api/upload-b2.js
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Bz-File-Name');
    
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
        
        // 3. Lire le fichier depuis la requête
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        // 4. Récupérer les headers
        const fileName = req.headers['x-bz-file-name'];
        const contentType = req.headers['content-type'] || 'application/octet-stream';
        
        if (!fileName) {
            return res.status(400).json({ error: 'Header X-Bz-File-Name manquant' });
        }
        
        // 5. Upload vers B2 (depuis Vercel, pas de CORS !)
        console.log('Upload vers B2:', fileName, 'Taille:', fileBuffer.length);
        
        const b2UploadResponse = await fetch(uploadData.uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': uploadData.authorizationToken,
                'X-Bz-File-Name': fileName,
                'Content-Type': contentType,
                'X-Bz-Content-Sha1': 'do_not_verify',
                'Content-Length': fileBuffer.length.toString()
            },
            body: fileBuffer
        });
        
        if (!b2UploadResponse.ok) {
            const errorText = await b2UploadResponse.text();
            console.error('Erreur B2:', b2UploadResponse.status, errorText);
            throw new Error(`Upload B2 échoué: ${b2UploadResponse.status}`);
        }
        
        const b2Result = await b2UploadResponse.json();
        console.log('Upload B2 réussi:', b2Result.fileName);
        
        return res.status(200).json({
            success: true,
            fileId: b2Result.fileId,
            fileName: b2Result.fileName,
            downloadUrl: `https://f005.backblazeb2.com/file/minbar-media/${encodeURIComponent(b2Result.fileName)}`
        });
        
    } catch (error) {
        console.error('Erreur complète:', error);
        return res.status(500).json({ error: error.message });
    }
}
