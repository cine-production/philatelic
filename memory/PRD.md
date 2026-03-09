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
- **IA**: Ollama + LLaVA (hébergé localement sur PC Windows)
- **Auth**: Email/mot de passe (JWT)
- **Paiement**: Stripe + PayPal
- **Design**: Moderne, thème clair
- **Hébergement cible**: PC Windows local (24/7)

## User Personas
1. **Administrateur/Vendeur**: Ajoute des produits via upload photo + analyse IA
2. **Collectionneurs/Acheteurs**: Parcourent le catalogue, filtrent, achètent

## Core Requirements (Static)
- [x] Authentification admin (JWT)
- [x] CRUD Produits (timbres/enveloppes)
- [x] Analyse IA des images (Ollama/LLaVA)
- [x] Catalogue avec filtres avancés
- [x] Panier
- [x] Checkout Stripe + PayPal
- [x] Gestion des commandes

## What's Been Implemented (Jan 2026)

### Backend (FastAPI + MongoDB)
- Auth routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Products CRUD: `/api/products` (GET, POST, PUT, DELETE)
- Cart: `/api/cart` (GET, POST, DELETE)
- Orders: `/api/orders` (GET, POST)
- Payments: `/api/payments/stripe/*`, `/api/payments/paypal/*`
- AI Analysis: `/api/ai/analyze`, `/api/ai/status`
- Admin: `/api/admin/stats`, `/api/admin/orders`

### Frontend (React)
- Pages: Home, Stamps, Envelopes, ProductDetail, Cart, Checkout, CheckoutSuccess, CheckoutCancel
- Admin: Login, Dashboard, AddProduct, Products, Orders
- Components: Navbar, Footer, ProductCard, FilterSidebar
- Context: AuthContext, CartContext

### Design System
- Theme: "Philatelic Curator" - Museum/Gallery aesthetic
- Fonts: Playfair Display (headings), Inter (body), JetBrains Mono (data)
- Colors: Warm paper background, Burgundy primary, Royal Blue secondary

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Basic auth flow
- [x] Product display with filters
- [x] Cart functionality
- [x] Checkout with Stripe
- [x] Admin product management

### P1 (High Priority - Pending)
- [ ] PayPal credentials configuration (user needs to add PAYPAL_CLIENT_ID/SECRET)
- [ ] Ollama setup guide for user's Windows PC
- [ ] Product image upload to cloud storage (currently base64)
- [ ] Email notifications for orders

### P2 (Medium Priority)
- [ ] Product search by text
- [ ] User accounts for buyers (wishlist, order history)
- [ ] Inventory management (stock levels)
- [ ] Shipping cost calculator

### P3 (Nice to Have)
- [ ] Multi-currency support
- [ ] Product reviews
- [ ] Related products suggestions
- [ ] Analytics dashboard

## Next Tasks
1. User to install Ollama + LLaVA on their Windows PC
2. Configure PayPal sandbox/production credentials
3. Set up reverse proxy (ngrok/Cloudflare Tunnel) for local hosting
4. Add product image storage solution
5. Deploy to user's local environment
