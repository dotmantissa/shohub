import { PrivyClient } from "@privy-io/node";

let client: PrivyClient | null = null;

function getPrivyClient() {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Privy server credentials are not configured.");
  client ??= new PrivyClient({ appId, appSecret });
  return client;
}

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export async function verifyPrivyToken(token: string | null): Promise<AuthenticatedUser> {
  if (!token) throw new Error("Authentication required.");
  const claims = await getPrivyClient().utils().auth().verifyAccessToken(token);
  return { id: claims.user_id, email: null };
}
