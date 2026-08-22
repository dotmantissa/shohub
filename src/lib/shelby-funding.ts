import { AccountAddress } from "@aptos-labs/ts-sdk";
import {
  EIP1193DerivedPublicKey,
  defaultEthereumAuthenticationFunction,
  type EthereumAddress,
} from "@aptos-labs/derived-wallet-ethereum";

export const APT_TARGET_OCTAS = 10_000_000;
export const APT_REFILL_THRESHOLD_OCTAS = 2_000_000;
export const DEPLOYER_RESERVE_OCTAS = 500_000_000;
export const SHELBY_USD_TARGET = 10_000_000;
export const SHELBY_USD_REFILL_THRESHOLD = 2_000_000;

const DOMAIN_PATTERN =
  /^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$|^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?::\d{1,5})?$/i;

export function normalizeShelbyAddress(address: string) {
  return AccountAddress.from(address).toString();
}

export function normalizeShelbyDomain(domain: string) {
  const normalized = domain.trim().toLowerCase();
  if (!normalized || normalized.length > 253 || !DOMAIN_PATTERN.test(normalized)) {
    throw new Error("The Shelby account domain is invalid.");
  }
  return normalized;
}

export function allowedShelbyDomains(input: {
  appDomain: string;
  extraDomains?: string;
  nodeEnv?: string;
}) {
  const domains = new Set<string>();
  domains.add(normalizeShelbyDomain(input.appDomain));
  for (const domain of input.extraDomains?.split(",") ?? []) {
    if (domain.trim()) domains.add(normalizeShelbyDomain(domain));
  }
  if (input.nodeEnv !== "production") {
    domains.add("localhost:8080");
    domains.add("127.0.0.1:8080");
  }
  return domains;
}

export function assertAllowedShelbyDomain(domain: string, allowedDomains: Set<string>) {
  const normalized = normalizeShelbyDomain(domain);
  if (!allowedDomains.has(normalized)) {
    throw new Error("This Shohub domain is not approved for account funding.");
  }
  return normalized;
}

export function deriveShelbyAddress(ethereumAddress: string, domain: string) {
  const publicKey = new EIP1193DerivedPublicKey({
    domain: normalizeShelbyDomain(domain),
    ethereumAddress: ethereumAddress as EthereumAddress,
    authenticationFunction: defaultEthereumAuthenticationFunction,
  });
  return publicKey.authKey().derivedAddress().toString();
}

export function fundingTopUp(balance: number, target: number, refillThreshold: number) {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new Error("The account balance is invalid.");
  }
  if (balance >= refillThreshold) return 0;
  return Math.max(0, target - balance);
}

export function assertSponsorReserve(input: {
  sponsorBalance: number;
  transferAmount: number;
  reserve: number;
}) {
  if (input.sponsorBalance - input.transferAmount < input.reserve) {
    throw new Error("Shohub account funding is temporarily unavailable.");
  }
}
