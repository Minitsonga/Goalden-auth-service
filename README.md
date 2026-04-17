# Auth Service

Service responsable de l'identite utilisateur de Goalden : creation de compte, session, tokens JWT et profil.

## Ce que le service fait

- Gere l'authentification utilisateur (`register-with-invitation`, `login`, `refresh`, `logout`).
- Emet les JWT utilisateur et les jetons de refresh.
- Emet et verifie les JWT service pour la communication inter-services.
- Expose les informations utilisateur aux autres services via des routes internes.
- Gere la mise a jour du profil utilisateur (dont `avatarFileId`) et la reinitialisation de mot de passe.

## Endpoints principaux

### Public/Auth (`/api/auth`)

- `POST /register` : desactive fonctionnellement (retourne une erreur orientant vers l'inscription avec invitation).
- `POST /register-with-invitation` : creation de compte + consommation d'une invitation team-service.
- `POST /login` : connexion, renvoie `accessToken` + `refreshToken`.
- `POST /refresh` : rotation du token de refresh.
- `POST /logout` : invalidation des refresh tokens de l'utilisateur connecte.
- `POST /request-password-reset` et `POST /reset-password`.

### Profil utilisateur (`/api/users`)

- `GET /me` : profil du user connecte.
- `PATCH /me` : mise a jour profil.
- `PATCH /:userId/global-role` : changement de role global (admin uniquement).

### Interne (`/internal`)

- `POST /service-token` : emet un JWT de service (M2M) a partir de `serviceId/serviceSecret`.
- `POST /verify-service-token` : verifie/decode un token de service.
- `GET /users/:userId` : fiche user minimale.
- `POST /users/batch` : resolution de plusieurs utilisateurs.

## Interactions avec les autres services

### Sortantes (auth-service -> autres)

- `team-service`
  - `POST /internal/invitations/consume` : consomme le code d'invitation a l'inscription.
  - `GET /internal/users/:userId/profile-eligibility` : verifie qu'un utilisateur a un membership actif avant modification de profil.

### Entrantes (autres -> auth-service)

- `gateway`, `event-service`, `social-service` (et autres consommateurs M2M)
  - utilisent `POST /internal/service-token` pour obtenir un JWT service.
- `event-service`
  - utilise `POST /internal/users/batch` pour enrichir les RSVP avec les infos profil.
- `gateway`
  - consomme les routes `api/auth/*` et `api/users/me` pour exposer GraphQL.

## Stack technique

- Node.js + TypeScript (ESM), Express.
- MongoDB (Mongoose) : users, refresh tokens, password reset tokens.
- JWT (`USER_JWT_SECRET`, `SERVICE_JWT_SECRET`) + bcrypt.

## Demarrage local

```bash
npm install
cp .env.example .env
npm run dev
```

Variables: voir `.env.example`.
