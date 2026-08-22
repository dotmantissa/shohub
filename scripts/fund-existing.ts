import { PrivyClient } from "@privy-io/node";
import { neon } from "@neondatabase/serverless";
import {
  fundShelbyAddressForMaintenance,
  provisionUserShelbyAccount,
} from "../src/lib/shelby-funding.server";
import { allowedShelbyDomains, deriveShelbyAddress } from "../src/lib/shelby-funding";

const sql = neon(process.env.NEON_DATABASE_URL!);
const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const domains = new Set(
  [
    process.env.VITE_APP_DOMAIN || "shohub.app",
    "localhost:8080",
    "127.0.0.1:8080",
    ...allowedShelbyDomains({
      appDomain: process.env.VITE_APP_DOMAIN || "shohub.app",
      extraDomains: process.env.SHELBY_ALLOWED_DOMAINS,
      nodeEnv: "development",
    }),
  ].filter(Boolean),
);

const users = await sql`select id, wallet_address from users`;
const projectAddresses = await sql`
  select distinct owner_wallet_address as wallet_address
  from projects
  where owner_wallet_address is not null`;
const addresses = new Set(
  [...users, ...projectAddresses]
    .map((row) => row.wallet_address)
    .filter((address): address is string => typeof address === "string"),
);

for await (const user of privy.users().list({ limit: 100 })) {
  const ethereumWalletAddresses = user.linked_accounts
    .filter(
      (account) =>
        account.type === "wallet" &&
        account.chain_type === "ethereum" &&
        account.wallet_client_type === "privy",
    )
    .map((account) => account.address);
  const emailAccount = user.linked_accounts.find((account) => account.type === "email");
  const authUser = {
    id: user.id,
    email: emailAccount?.type === "email" ? emailAccount.address : null,
    ethereumWalletAddresses,
  };
  for (const ethereumAddress of ethereumWalletAddresses) {
    for (const domain of domains) {
      const address = deriveShelbyAddress(ethereumAddress, domain);
      addresses.add(address);
      const result = await provisionUserShelbyAccount({
        user: authUser,
        address,
        domain,
      }).catch((error) => {
        console.error(`Could not provision ${domain}:`, error);
        return null;
      });
      if (result) {
        console.log(JSON.stringify({ user: user.id, domain, ...result }));
      }
    }
  }
}

for (const address of addresses) {
  const result = await fundShelbyAddressForMaintenance(address);
  console.log(JSON.stringify({ address, ...result }));
}
