---
name: auth-setup
description: Add authentication and multi-tenancy to an API. Configures user management, sessions, and organization-scoped data isolation. Triggers on "add authentication", "set up auth", "add login", "add sign up", "configure BetterAuth".
---

# Auth Setup

Add authentication to an existing API. Handles user registration, login, sessions, and organization-scoped data isolation.

## Prerequisites

- An API project created with `api-builder` (or `apso init` + `apso generate`)
- PostgreSQL running (`apso dev` or `npm run compose`)

## Setup Process

### Step 1: Add Auth Entities to Schema

Add the BetterAuth entities to your `.apsorc`. See the `auth-entities` skill for complete patterns.

The minimum BetterAuth setup requires these entities:

```json
{
  "auth": {
    "provider": "better-auth"
  },
  "entities": [
    {
      "name": "User",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "email", "type": "text", "length": 255, "is_email": true },
        { "name": "name", "type": "text", "length": 100, "nullable": true },
        { "name": "avatar_url", "type": "text", "nullable": true },
        { "name": "email_verified", "type": "boolean", "default": "false" }
      ]
    },
    {
      "name": "account",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "providerId", "type": "text", "length": 50 },
        { "name": "accountId", "type": "text", "length": 255 },
        { "name": "password", "type": "text", "nullable": true }
      ]
    },
    {
      "name": "session",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "token", "type": "text", "length": 255, "unique": true },
        { "name": "expiresAt", "type": "date" },
        { "name": "ipAddress", "type": "text", "length": 45, "nullable": true },
        { "name": "userAgent", "type": "text", "nullable": true }
      ]
    },
    {
      "name": "verification",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "identifier", "type": "text", "length": 255 },
        { "name": "value", "type": "text", "length": 255 },
        { "name": "expiresAt", "type": "date" }
      ]
    }
  ]
}
```

### Step 2: Regenerate Code

```bash
apso generate
```

This produces auth and scope guards in `src/autogen/guards/` and entity modules for all auth tables.

### Step 3: Fix Known Issues

After generation, apply these fixes:

**Add `id` to Create DTOs** (BetterAuth sends its own UUIDs):
```typescript
// src/autogen/User/dtos/User.dto.ts
export class UserCreate {
  @ApiProperty()
  @IsUUID()
  id: string;  // Add this field
  // ...
}
```

Apply the same fix to `accountCreate` and `sessionCreate` DTOs.

**Verify nullable fields** in entity files:
```typescript
// src/autogen/User/User.entity.ts
@Column({ nullable: true })
avatar_url: string;

@Column({ nullable: true })
password_hash: string;
```

### Step 4: Configure Environment

Add to `.env`:
```bash
BETTER_AUTH_SECRET=your-secret-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3003
```

### Step 5: Provision Database

```bash
npm run provision
```

This creates the `user`, `account`, `session`, and `verification` tables.

### Step 6: Verify

```bash
# Test user creation
curl -X POST http://localhost:3001/Users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "'$(uuidgen)'",
    "email": "test@example.com",
    "name": "Test User",
    "email_verified": false
  }'

# Verify all endpoints
curl http://localhost:3001/Users
curl http://localhost:3001/accounts
curl http://localhost:3001/sessions
curl http://localhost:3001/verifications
```

## How BetterAuth Stores Credentials

Passwords live in the `account` table, not the `User` table:

```
User table          account table
┌──────────────┐    ┌─────────────────────┐
│ id           │    │ id                  │
│ email        │────│ userId              │
│ name         │ 1:N│ providerId          │ ← "credential"
│ email_verified│   │ password (bcrypt)   │ ← Password here
└──────────────┘    └─────────────────────┘
```

The sign-in flow:
1. BetterAuth finds user by email
2. Loads associated accounts
3. Finds account where `providerId = "credential"`
4. Compares bcrypt hash in `account.password`

If `providerId` is null or missing, login always fails.

## Frontend Integration

Install BetterAuth in your frontend:

```bash
npm install better-auth @apso/better-auth-adapter@latest
```

Configure the auth client:

```typescript
import { betterAuth } from 'better-auth';
import { createApsoAdapter } from '@apso/better-auth-adapter';

export const auth = betterAuth({
  database: createApsoAdapter({
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  }),
  emailAndPassword: { enabled: true },
});
```

## Alternative Auth Providers

BetterAuth is the default. Other supported providers:

| Provider | Config key | Use case |
|----------|-----------|----------|
| `better-auth` | `provider: "better-auth"` | Self-hosted, full control |
| `auth0` | `provider: "auth0"` | Enterprise SSO, managed service |
| `clerk` | `provider: "clerk"` | Drop-in UI components |
| `cognito` | `provider: "cognito"` | AWS-native apps |
| `api-key` | `provider: "api-key"` | Service-to-service auth |
| `custom-db-session` | `provider: "custom-db-session"` | Custom session table |

See `auth-entities` skill for schema patterns for each provider.
