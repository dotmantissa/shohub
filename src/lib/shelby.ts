import { Network } from "@aptos-labs/ts-sdk";
import { NetworkToDefaultLocationHint, ShelbyClient } from "@shelby-protocol/sdk/browser";
import { SHELBY_API_KEY, SHELBY_RPC_URL } from "./config";

let client: ShelbyClient | null = null;

export function createShelbyClient(_chainId?: number) {
  client ??= new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: SHELBY_API_KEY || undefined,
    rpc: { baseUrl: SHELBY_RPC_URL, apiKey: SHELBY_API_KEY || undefined },
    aptos: { network: Network.SHELBYNET },
    locationHint: NetworkToDefaultLocationHint[Network.SHELBYNET],
  });
  return client;
}

export function shelbyBlobUrl(account: string, blobName: string) {
  return `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${account}/${blobName}`;
}
