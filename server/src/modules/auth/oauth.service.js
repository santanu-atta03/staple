const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
let appleKeysCache = null;
let appleKeysExpiresAt = 0;

const invalidCredential = () => {
  const error = new Error("The identity provider token is invalid or expired");
  error.status = 401;
  return error;
};

const unavailable = (message) => {
  const error = new Error(message);
  error.status = 503;
  return error;
};

const verifyGoogleCredential = async (credential) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw unavailable("Google authentication is not configured");
  if (typeof credential !== "string" || !credential) throw invalidCredential();

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(credential)}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!tokenInfoResponse.ok) throw invalidCredential();
  const tokenInfo = await tokenInfoResponse.json();
  const audience = tokenInfo.aud || tokenInfo.issued_to || tokenInfo.audience;
  if (audience !== clientId || Number(tokenInfo.expires_in) <= 0) {
    throw invalidCredential();
  }

  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${credential}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw invalidCredential();

  const claims = await response.json();
  if (
    (claims.email_verified !== true && claims.email_verified !== "true") ||
    typeof claims.email !== "string" ||
    !claims.sub ||
    Number(claims.exp) <= Math.floor(Date.now() / 1000)
  ) {
    throw invalidCredential();
  }

  return {
    subject: claims.sub,
    email: claims.email.toLowerCase(),
    fullName: claims.name || "",
  };
};

const getAppleKeys = async () => {
  if (appleKeysCache && appleKeysExpiresAt > Date.now()) return appleKeysCache;

  const response = await fetch(APPLE_KEYS_URL, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Could not retrieve Apple signing keys");
  const { keys } = await response.json();
  appleKeysCache = keys;
  appleKeysExpiresAt = Date.now() + 60 * 60 * 1000;
  return keys;
};

const verifyAppleCredential = async (identityToken) => {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw unavailable("Apple authentication is not configured");
  if (typeof identityToken !== "string" || !identityToken) throw invalidCredential();

  const [encodedHeader] = identityToken.split(".");
  let header;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
  } catch {
    throw invalidCredential();
  }

  const jwk = (await getAppleKeys()).find((key) => key.kid === header.kid);
  if (!jwk || header.alg !== "RS256") throw invalidCredential();

  const claims = jwt.verify(
    identityToken,
    crypto.createPublicKey({ key: jwk, format: "jwk" }),
    {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
      audience: clientId,
    }
  );
  if (
    !claims.sub ||
    !claims.email ||
    (claims.email_verified !== true && claims.email_verified !== "true")
  ) {
    throw invalidCredential();
  }

  return {
    subject: claims.sub,
    email: claims.email.toLowerCase(),
  };
};

module.exports = {
  verifyGoogleCredential,
  verifyAppleCredential,
};
