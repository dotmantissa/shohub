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
  ethereumWalletAddresses: string[];
};

export async function verifyPrivyToken(token: string | null): Promise<AuthenticatedUser> {
  if (!token) throw new Error("Authentication required.");
  const privy = getPrivyClient();
  const claims = await privy.utils().auth().verifyAccessToken(token);
  const user = await privy.users()._get(claims.user_id);
  const emailAccount = user.linked_accounts.find((account) => account.type === "email");
  const email = emailAccount?.type === "email" ? emailAccount.address : null;
  const ethereumWalletAddresses = user.linked_accounts.flatMap((account) =>
    account.type === "wallet" &&
    "chain_type" in account &&
    "wallet_client_type" in account &&
    account.chain_type === "ethereum" &&
    account.wallet_client_type === "privy"
      ? [account.address]
      : [],
  );
  if (ethereumWalletAddresses.length === 0) {
    throw new Error("Your embedded wallet is still being prepared.");
  }
  return { id: user.id, email, ethereumWalletAddresses };
}
