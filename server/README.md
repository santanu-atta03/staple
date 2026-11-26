# Staple server setup

## Start the local database

The API requires MongoDB for accounts, sessions, and verification challenges. It
does not fall back to an in-memory or JSON authentication database.

This Windows machine has a MongoDB service installed. Start it from an
Administrator PowerShell:

```powershell
Start-Service MongoDB
Get-Service MongoDB
```

The service should report `Running` and listen on `127.0.0.1:27017`. If MongoDB
is hosted elsewhere, set `MONGO_URI` in `server/.env` to that reachable instance
instead. Do not copy production credentials into source control.
To start the installed service automatically after Windows restarts, run
`Set-Service -Name MongoDB -StartupType Automatic` from Administrator
PowerShell.

If Node reports `querySrv ECONNREFUSED` for an Atlas `mongodb+srv://` URI,
Node's DNS resolver is refusing the SRV lookup. Configure a reachable DNS
resolver in `server/.env`, for example:

```dotenv
MONGODB_DNS_SERVERS=8.8.8.8,8.8.4.4
```

Use the DNS servers approved for your network. Restart `npm run dev` after
changing this setting. The server applies this override only to Node's DNS
resolver; it does not change Windows network settings.

## Configure the server

Create `server/.env` from `.env.example`, then set:

- `MONGO_URI` to the reachable MongoDB instance.
- `JWT_ACCESS_SECRET` to a random secret of at least 32 bytes.
- `OTP_HMAC_SECRET` to a separate random secret of at least 32 bytes.
- `SMTP_HOST`, `SMTP_PORT`, and the SMTP credentials required by your mail
  provider. Set `SMTP_FROM` to an authorized sender address; if it is omitted,
  the server uses `SMTP_USER` as the sender. Registration and password reset
  fail if the OTP signing secret or email delivery configuration is missing.
- `GOOGLE_CLIENT_ID` when enabling Google sign-in.
- `APPLE_CLIENT_ID` and `APPLE_REDIRECT_URI` when enabling Apple sign-in.

Generate fresh secrets rather than using the placeholders:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Run the command twice and use one output for each server secret. Keep
`OTP_HMAC_SECRET` stable across restarts so pending verification codes remain
verifiable.

The auth page fetches public OAuth client configuration from `/auth/providers`,
so the server-side client IDs are the source of truth. Optional Vite overrides
(`VITE_GOOGLE_CLIENT_ID`, `VITE_APPLE_CLIENT_ID`, and
`VITE_APPLE_REDIRECT_URI`) must match the server/provider console values. Only
public client IDs go in browser configuration; signing keys and provider
secrets remain server-side. For Google, authorize `http://localhost:5173` as a
JavaScript origin in the Google Cloud OAuth client.

## Run the application

Use two terminals from the repository root:

```powershell
cd server
npm run dev
```

```powershell
cd client
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Check
`http://localhost:5055/api/v1/health` for API/database status. Authentication
and registration require MongoDB; email OTP and provider sign-in additionally
require their respective external service configuration.
