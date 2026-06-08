// api/upload-b2-chunked.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Logique pour traiter le chunk (morceau) reçu
      // 1. Récupérer le fichier ou le morceau
      // 2. Envoyer vers Backblaze B2 avec le SDK b2-sdk
      // 3. Retourner une réponse de succès
      res.status(200).json({ message: "Chunk reçu avec succès" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur lors de l'upload" });
    }
  } else {
    res.status(405).json({ message: "Méthode non autorisée" });
  }
}
