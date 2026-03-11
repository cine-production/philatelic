"# Philatelic Curator - Product Requirements Document

## Problème Original
Site e-commerce pour timbres et enveloppes avec analyse IA.

## Fonctionnalités Implémentées (Mars 2026)

### Core Features ✅
- [x] Application full-stack (FastAPI + React + MongoDB)
- [x] Authentification admin avec JWT
- [x] Gestion des produits (CRUD)
- [x] Analyse IA (Gemini, Ollama, Manuel)
- [x] Panier et checkout
- [x] Intégration Stripe/PayPal

### Session Actuelle ✅

#### 1. Système de stock
- [x] Champ `stock_quantity` (défaut: 1)
- [x] Affichage \"En stock\" / \"Rupture de stock\"
- [x] Modification stock lors édition produit
- [x] Blocage ajout panier si stock épuisé
- [x] Décrémentation automatique à la commande

#### 2. Système de commande complet
- [x] Statuts: En attente → Payée → Préparation → Expédiée → Livrée → Reçue
- [x] Code de suivi unique (ex: ABC12345)
- [x] Email client obligatoire au checkout
- [x] Numéro de suivi postal et transporteur

#### 3. Page de suivi client `/suivi`
- [x] Recherche par code de suivi
- [x] Progression visuelle des étapes
- [x] Bouton \"J'ai reçu mon colis\"
- [x] Bouton télécharger PDF

#### 4. ID de classification
- [x] Format: `ANNÉE-PAYS-CATÉGORIE-NUMÉRO`
- [x] Ex: `1960-FR-COM-001`
- [x] Généré automatiquement par l'IA
- [x] Modifiable lors édition produit

#### 5. Notifications email (Resend)
- [x] Email confirmation de commande
- [x] Email expédition avec numéro de suivi
- [x] Email livraison avec bouton confirmation

#### 6. Téléchargement PDF
- [x] Fiche préparation admin (avec ID classification)
- [x] Récapitulatif commande client

#### 7. Corrections
- [x] Bug filtres pays/catégorie corrigé
- [x] Modèle AIAnalysisResponse avec valeurs par défaut

## Configuration Email (Resend)

Pour activer les emails :
1. Créer un compte sur https://resend.com
2. Créer une clé API
3. Ajouter dans `backend/.env`:
```
RESEND_API_KEY=re_votre_cle
SENDER_EMAIL=votre@domaine.com
SITE_NAME=Philatelic Curator
SITE_URL=https://votre-domaine.com
```

## Quotas Gratuits

| Service | Quota gratuit |
|---------|---------------|
| Gemini 1.5 Flash | 1,500 req/jour |
| Resend | 100 emails/jour |
| MongoDB | Illimité (local) |

## Codes de Classification

| Code | Description |
|------|-------------|
| DEF | Définitif (usage courant) |
| COM | Commémoratif |
| AIR | Poste aérienne |
| TAX | Taxe |
| ENV | Enveloppe |
| BLO | Bloc-feuillet |
| AUT | Autre |

## Prochaines Tâches

### P1 (Prioritaire)
- [ ] Intégrer Groq comme alternative IA
- [ ] Bouton \"Vérifier sur Colnect\"

### P2
- [ ] Configuration clés production Stripe/PayPal
- [ ] Amélioration mobile

### P3
- [ ] Export CSV des commandes
- [ ] Historique des prix
"