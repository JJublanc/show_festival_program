# Déploiement

L'application fonctionne en mode **statique pur** : aucun backend, aucune base de données. Les shows d'un festival sont sérialisés en JSON et importés directement par le bundle webpack.

## Mise à jour des données

Depuis la racine du repo :

```bash
cd pipeline
./.venv/bin/python data_gathering_etrange_festival.py -y 2026 --export-json --no-api
```

Cela produit :

- `frontend/src/data/EtrangeFestival2026.json` (un fichier par festival)
- `frontend/src/data/festivals.json` (index consommé par le sélecteur)

Vérifier localement :

```bash
cd frontend
npm run build
npx serve dist -l 8090
```

Ouvrir http://localhost:8090.

## Ajouter un nouveau festival

1. Écrire un scraper `pipeline/data_gathering_<festival>.py` (ou étendre l'existant).
2. Le lancer avec `--export-json` : il ajoute une entrée dans `festivals.json` et un fichier `<FestivalName><year>.json`.
3. Commit + push.

## Déploiement Vercel

Une seule fois :

1. Créer un compte Vercel et connecter le repo GitHub.
2. Import du projet → dans "Root Directory" indiquer `frontend`.
3. Vercel détecte `vercel.json` : build `npm run build`, output `dist`.
4. Lier le nom de domaine (`monetrangeprogramme.com`) dans Settings → Domains.
5. Configurer OVH pour que `www.monetrangeprogramme.com` (CNAME) et le domaine racine pointent vers Vercel (Vercel donne les enregistrements à créer).

Ensuite : chaque `git push` sur `main` déclenche un déploiement.

## Backend (dev local uniquement)

Le backend Express dans `backend/` reste utilisable pour du dev local si tu veux valider la pipeline avec une vraie base MongoDB avant d'exporter. Il n'est pas requis pour la production.
