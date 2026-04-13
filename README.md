# auth-service

Microservice Goalden — Authentification, gestion des comptes et émission des JWT.

## Responsabilités

- Inscription / connexion / déconnexion des utilisateurs
- Émission et rafraîchissement des JWT utilisateur (access + refresh token)
- Réinitialisation de mot de passe
- Émission des JWT service pour la communication inter-services
- Exposition des données utilisateur aux autres services (`/internal/*`)

## Stack

- **Runtime** : Node.js + TypeScript (ESM)
- **Framework** : Express 4
- **Base de données** : MongoDB (base `goalden_auth`) via Mongoose
- **Auth** : JWT (jsonwebtoken) + bcrypt

## Endpoints

### Public (`/api/auth/*`)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion → `{ accessToken, refreshToken }` |
| POST | `/api/auth/refresh` | Rafraîchir l'access token |
| POST | `/api/auth/logout` | Déconnexion (requiert JWT) |
| POST | `/api/auth/request-password-reset` | Demande de reset |
| POST | `/api/auth/reset-password` | Reset du mot de passe |

### Utilisateur (`/api/users/*`)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/users/me` | Profil de l'utilisateur connecté (requiert JWT) |

### Interne (`/internal/*`)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/internal/service-token` | Obtenir un JWT service |
| POST | `/internal/verify-service-token` | Vérifier un JWT service |
| GET | `/internal/users/:userId` | Récupérer un utilisateur (requiert JWT service) |
| POST | `/internal/users/batch` | Récupérer plusieurs utilisateurs (requiert JWT service) |

## Lancement

```bash
cp .env.example .env
# Remplir les variables dans .env
npm install
npm run dev
```

## Variables d'environnement

Voir `.env.example` pour la liste complète.
