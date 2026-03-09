# Philatelic Curator - PRD (Product Requirements Document)

## Original Problem Statement
Site de vente de timbres et enveloppes avec :
- Page administrateur pour ajouter des produits via photo + analyse IA (Ollama + LLaVA)
- IA pour : détecter l'état, vérifier oblitération, extraire infos (date, histoire, provenance, tirage), calculer valeur/prix
- Confirmation des infos puis enregistrement en BDD
- Paiement Stripe + PayPal
- 2 sections : Timbres et Enveloppes
- Filtres : date, rareté, prix, catégorie, pays, oblitéré

## User Choices
- **IA**: Ollama + LLaVA (hébergé localement sur PC Windows 24/7)
- **Auth**: Email/mot de passe (JWT) - admin uniquement
- **Paiement**: Stripe + PayPal
- **Design**: Moderne, thème clair "Museum/Gallery"
- **Hébergement cible**: PC Windows local

## User Personas
1. **Administrateur/Vendeur**: Scanne des produits via caméra/upload, l'IA analyse et propose un prix, confirme avant mise en vente
2. **Collectionneurs/Acheteurs**: Parcourent le catalogue, filtrent par critères, achètent via Stripe/PayPal

## What's Been Implemented (Jan 2026)

### Backend (FastAPI + MongoDB)
- Auth JWT: register/login/me
- Products CRUD avec filtres avancés
- Cart avec session ID
- Orders avec shipping info
- Payments Stripe (fonctionnel) + PayPal (nécessite credentials)
- AI Analysis via Ollama LLaVA
- Admin stats et gestion commandes

### Frontend (React + Tailwind + Shadcn)
**Pages publiques:**
- Home: Hero section, catégories Timbres/Enveloppes
- Stamps/Envelopes: Catalogues avec filtres (oblitération, état, rareté, prix, pays)
- ProductDetail: Fiche produit complète
- Cart/Checkout: Panier et paiement

**Pages admin (protégées):**
- Login: Connexion/Inscription (1er user = admin)
- Dashboard: Stats (produits, commandes, CA)
- **Scanner produit** (AMÉLIORÉ): 
  - Étape 1: Prendre photo (caméra) ou importer image
  - Étape 2: Analyse IA automatique → remplit tous les champs
  - Étape 3: Confirmation avec possibilité de modifier avant enregistrement
- Products: Liste avec modification/suppression inline
- Orders: Suivi et mise à jour statuts

### Design System
- Theme: "Philatelic Curator" - Warm paper background
- Fonts: Playfair Display + Inter + JetBrains Mono
- Colors: Burgundy primary (#7a2048), Royal Blue secondary

## Flux Admin Scanner (Mis à jour)
1. Cliquer "Scanner un produit"
2. Prendre photo via caméra OU importer image
3. L'IA analyse automatiquement:
   - Détecte état (Neuf/Excellent/Bon/Correct/Usé)
   - Vérifie oblitération
   - Identifie pays, année, catégorie
   - Estime rareté
   - Calcule valeur et propose prix de vente
4. Affichage des résultats pour vérification
5. Possibilité de modifier les infos
6. Confirmation → Enregistrement → Mise en vente

## Next Tasks (P1)
1. **Pour l'utilisateur**:
   - Installer Ollama: `winget install Ollama.Ollama`
   - Installer LLaVA: `ollama pull llava`
   - Lancer Ollama: `ollama serve`
2. Configurer PayPal credentials dans .env
3. Configurer reverse proxy pour accès externe (ngrok/Cloudflare Tunnel)

## P2 Features
- Email notifications (commandes)
- Recherche textuelle produits
- Historique des prix
- Export CSV des commandes
