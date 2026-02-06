import { PrivyClient } from "@privy-io/server-auth";

// Server-side Privy client
export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID || "",
  process.env.PRIVY_APP_SECRET || ""
);

/**
 * Verify a Privy access token
 */
export async function verifyPrivyToken(token: string) {
  try {
    const user = await privyClient.getUser(token);
    return user;
  } catch (error) {
    console.error("[Privy] Token verification failed:", error);
    return null;
  }
}

/**
 * Get user from Privy ID
 */
export async function getPrivyUser(privyId: string) {
  try {
    const user = await privyClient.getUserById(privyId);
    return user;
  } catch (error) {
    console.error("[Privy] Get user failed:", error);
    return null;
  }
}
