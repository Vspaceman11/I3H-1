#!/usr/bin/env node
/**
 * Generate JWT keys for Convex Auth.
 * Run: node scripts/generate-auth-keys.mjs
 *
 * Then run:
 *   npx convex env set --from-file .env.auth
 *
 * Restart npx convex dev. Add .env.auth and .convex-auth-key.pem to .gitignore.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

const keyPath = join(process.cwd(), ".convex-auth-key.pem");
writeFileSync(keyPath, privateKey.trimEnd() + "\n", "utf8");

// .env.auth: PEM newlines as \n (dotenv expands to real newlines in quoted values)
const privateKeyEscaped = privateKey.trimEnd().replace(/\n/g, "\\n");
const envAuth = `JWT_PRIVATE_KEY="${privateKeyEscaped}"
JWKS=${JSON.stringify(jwks)}
`;
writeFileSync(join(process.cwd(), ".env.auth"), envAuth, "utf8");

console.log("Created .convex-auth-key.pem and .env.auth");
console.log("");
console.log("Set Convex env vars:");
console.log("  npx convex env set --from-file .env.auth");
console.log("");
console.log("Then restart: npx convex dev");
