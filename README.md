# Carte manif — éphémère

Carte collaborative en direct : points de RDV, nasses/barrages, secours, dangers.
Chaque point disparaît après 48 h. Pas de compte, pas de base de données, pas de logs.
Tout vit en mémoire : redémarrer le serveur efface tout.

## Lancer chez soi
    npm install
    npm start        # http://localhost:3000

## Déployer (le plus simple)
- **Render / Railway / Fly.io** : poussez le dossier sur GitHub, créez un « Web Service » Node,
  commande de build `npm install`, commande de démarrage `npm start`. HTTPS inclus.
- **VPS** : `npm install`, `PORT=3000 node server.js` derrière Caddy ou nginx (HTTPS obligatoire).

## À faire avant d'ouvrir au public
1. Remplacer les liens de messageries dans `public/index.html` (tableau MESSAGERIES).
2. Désactiver les logs d'accès de votre hébergeur / reverse proxy (nginx : `access_log off;`).
3. Option : héberger Leaflet vous-même plutôt que via unpkg.com.
4. Vérifier le cadre légal local avant diffusion.
