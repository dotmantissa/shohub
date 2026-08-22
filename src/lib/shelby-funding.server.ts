import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "@aptos-labs/ts-sdk";
import { SHELBYUSD_FA_METADATA_ADDRESS, ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { getDatabase } from "./neon.server";
import {
  APT_REFILL_THRESHOLD_OCTAS,
  APT_TARGET_OCTAS,
  DEPLOYER_RESERVE_OCTAS,
  SHELBY_USD_REFILL_THRESHOLD,
  SHELBY_USD_TARGET,
  allowedShelbyDomains,
  assertAllowedShelbyDomain,
  assertSponsorReserve,
  deriveShelbyAddress,
  fundingTopUp,
  normalizeShelbyAddress,
} from "./shelby-funding";
import type { AuthenticatedUser } from "./auth.server";

const SHELBY_FULLNODE_URL =
  process.env.SHELBY_FULLNODE_URL || "https://api.shelbynet.shelby.xyz/v1";
const DEFAULT_APP_DOMAIN = "shohub.app";

let aptosClient: Aptos | null = null;
let shelbyClient: ShelbyNodeClient | null = null;
let deployerAccount: Account | null = null;
const fundingLocks = new Map<string, Promise<FundingResult>>();

type FundingResult = {
  address: string;
  aptBalance: number;
  shelbyUsdBalance: number;
  funded: boolean;
};

function getAptosClient() {
  aptosClient ??= new Aptos(
    new AptosConfig({
      network: Network.SHELBYNET,
      fullnode: SHELBY_FULLNODE_URL,
    }),
  );
  return aptosClient;
}

function getShelbyClient() {
  const apiKey = process.env.VITE_SHELBY_API_KEY;
  const rpc = process.env.VITE_SHELBY_RPC_URL || "https://api.shelbynet.shelby.xyz/shelby";
  shelbyClient ??= new ShelbyNodeClient({
    network: Network.SHELBYNET,
    apiKey: apiKey || undefined,
    rpc: { baseUrl: rpc, apiKey: apiKey || undefined },
    aptos: { network: Network.SHELBYNET, fullnode: SHELBY_FULLNODE_URL },
  });
  return shelbyClient;
}

function getDeployerAccount() {
  if (deployerAccount) return deployerAccount;
  const value = process.env.SHELBY_DEPLOYER_PRIVATE_KEY;
  if (!value) throw new Error("Shohub account funding is not configured.");
  const privateKey = new Ed25519PrivateKey(value.replace(/^ed25519-priv-/, ""));
  const account = Account.fromPrivateKey({ privateKey, legacy: true });
  const expectedAddress = process.env.SHELBY_DEPLOYER_ADDRESS;
  if (
    expectedAddress &&
    account.accountAddress.toString() !== normalizeShelbyAddress(expectedAddress)
  ) {
    throw new Error("The configured Shelby funding signer does not match its address.");
  }
  deployerAccount = account;
  return deployerAccount;
}

function configuredDomains() {
  return allowedShelbyDomains({
    appDomain: process.env.VITE_APP_DOMAIN || DEFAULT_APP_DOMAIN,
    extraDomains: process.env.SHELBY_ALLOWED_DOMAINS,
    nodeEnv: process.env.NODE_ENV,
  });
}

function assertUserOwnsAddress(user: AuthenticatedUser, address: string, domain: string) {
  const normalizedAddress = normalizeShelbyAddress(address);
  const normalizedDomain = assertAllowedShelbyDomain(domain, configuredDomains());
  const ownsAddress = user.ethereumWalletAddresses.some(
    (ethereumAddress) =>
      deriveShelbyAddress(ethereumAddress, normalizedDomain) === normalizedAddress,
  );
  if (!ownsAddress) {
    throw new Error("This Shelby account does not belong to your signed in email.");
  }
  return { address: normalizedAddress, domain: normalizedDomain };
}

async function getAptBalance(address: string) {
  return getAptosClient().getAccountAPTAmount({ accountAddress: address });
}

async function getShelbyUsdBalance(address: string) {
  return getAptosClient().getBalance({
    accountAddress: address,
    asset: SHELBYUSD_FA_METADATA_ADDRESS,
  });
}

async function transferApt(address: string, amount: number) {
  const aptos = getAptosClient();
  const deployer = getDeployerAccount();
  const sponsorBalance = await getAptBalance(deployer.accountAddress.toString());
  assertSponsorReserve({
    sponsorBalance,
    transferAmount: amount,
    reserve: DEPLOYER_RESERVE_OCTAS,
  });
  const transaction = await aptos.transferCoinTransaction({
    sender: deployer.accountAddress,
    recipient: AccountAddress.from(address),
    amount,
  });
  const pending = await aptos.signAndSubmitTransaction({ signer: deployer, transaction });
  await aptos.waitForTransaction({
    transactionHash: pending.hash,
    options: { checkSuccess: true },
  });
}

async function fundAccount(address: string): Promise<FundingResult> {
  let aptBalance = await getAptBalance(address);
  let shelbyUsdBalance = await getShelbyUsdBalance(address);
  let funded = false;

  const aptAmount = fundingTopUp(aptBalance, APT_TARGET_OCTAS, APT_REFILL_THRESHOLD_OCTAS);
  if (aptAmount > 0) {
    await transferApt(address, aptAmount);
    aptBalance = await getAptBalance(address);
    funded = true;
  }

  const shelbyUsdAmount = fundingTopUp(
    shelbyUsdBalance,
    SHELBY_USD_TARGET,
    SHELBY_USD_REFILL_THRESHOLD,
  );
  if (shelbyUsdAmount > 0) {
    await getShelbyClient().fundAccountWithShelbyUSD({
      address,
      amount: shelbyUsdAmount,
    });
    shelbyUsdBalance = await getShelbyUsdBalance(address);
    funded = true;
  }

  return { address, aptBalance, shelbyUsdBalance, funded };
}

async function fundAccountOnce(address: string) {
  const active = fundingLocks.get(address);
  if (active) return active;
  const pending = fundAccount(address).finally(() => {
    fundingLocks.delete(address);
  });
  fundingLocks.set(address, pending);
  return pending;
}

export async function fundShelbyAddressForMaintenance(address: string) {
  return fundAccountOnce(normalizeShelbyAddress(address));
}

export async function provisionUserShelbyAccount(input: {
  user: AuthenticatedUser;
  address: string;
  domain: string;
}) {
  const account = assertUserOwnsAddress(input.user, input.address, input.domain);
  const sql = getDatabase();
  await sql`
    insert into users (id, email, wallet_address)
    values (${input.user.id}, ${input.user.email}, ${account.address})
    on conflict (id) do update set
      email = excluded.email,
      wallet_address = excluded.wallet_address,
      updated_at = now()`;
  await sql`
    insert into user_shelby_accounts (user_id, domain, wallet_address)
    values (${input.user.id}, ${account.domain}, ${account.address})
    on conflict (user_id, domain) do update set
      wallet_address = excluded.wallet_address,
      updated_at = now()`;

  const result = await fundAccountOnce(account.address);
  await sql`
    update user_shelby_accounts
    set apt_balance = ${result.aptBalance},
      shelby_usd_balance = ${result.shelbyUsdBalance},
      funded_at = now(),
      updated_at = now()
    where user_id = ${input.user.id} and domain = ${account.domain}`;
  return result;
}

export async function assertStoredShelbyAccount(userId: string, address: string) {
  const normalizedAddress = normalizeShelbyAddress(address);
  const sql = getDatabase();
  const rows = (await sql`
    select wallet_address
    from user_shelby_accounts
    where user_id = ${userId} and wallet_address = ${normalizedAddress}
    limit 1`) as Array<{ wallet_address: string }>;
  if (!rows[0]) {
    throw new Error("Your Shelby account needs to finish setting up before publishing.");
  }
}
