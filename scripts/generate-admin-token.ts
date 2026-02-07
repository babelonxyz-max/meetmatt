#!/usr/bin/env node
/**
 * Generate admin token for wallet pool API
 * Run with: npx ts-node scripts/generate-admin-token.ts
 */

import crypto from "crypto";

const token = crypto.randomBytes(32).toString("hex");

console.log("\n🔐 Admin Token Generated\n");
console.log("Token:", token);
console.log("\nAdd this to your Vercel environment variables:");
console.log("  Name: ADMIN_AUTH_TOKEN");
console.log("  Value:", token);
console.log("\nOr add to .env.local:");
console.log(`ADMIN_AUTH_TOKEN=${token}`);
console.log("\n⚠️  Save this token securely - it won't be shown again!\n");
