import { useStorageAccount } from "@shelby-protocol/ethereum-kit/react";
import { useUploadBlobs } from "@shelby-protocol/react";
import { AccountAddress } from "@aptos-labs/ts-sdk";
import type { EthereumWallet } from "@shelby-protocol/ethereum-kit/react";
import { useWallets } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { createWalletClient, custom, defineChain } from "viem";
import { SHELBY_CHAIN_ID, SHELBY_RPC_URL } from "@/lib/config";
import { createShelbyClient } from "@/lib/shelby";

export function useShelbyStorage() {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");
  const [walletAdapter, setWalletAdapter] = useState<EthereumWallet | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!embeddedWallet) {
      setWalletAdapter(null);
      return;
    }
    void embeddedWallet.getEthereumProvider().then((provider) => {
      if (cancelled) return;
      const shelbyChain = defineChain({
        id: SHELBY_CHAIN_ID,
        name: "Shelbynet",
        nativeCurrency: { name: "APT", symbol: "APT", decimals: 8 },
        rpcUrls: { default: { http: [SHELBY_RPC_URL] } },
      });
      const client = createWalletClient({
        account: embeddedWallet.address as `0x${string}`,
        chain: shelbyChain,
        transport: custom(provider),
      });
      setWalletAdapter(client as unknown as EthereumWallet);
    });
    return () => {
      cancelled = true;
    };
  }, [embeddedWallet]);

  const client = useMemo(() => createShelbyClient(SHELBY_CHAIN_ID), []);
  const storage = useStorageAccount({ client, wallet: walletAdapter });
  const uploadBlobs = useUploadBlobs({ client });

  const upload = async (file: File, blobName: string) => {
    if (!storage.storageAccountAddress || !storage.signAndSubmitTransaction) {
      throw new Error("Your embedded wallet is still being prepared.");
    }
    const data = new Uint8Array(await file.arrayBuffer());
    await uploadBlobs.mutateAsync({
      signer: {
        account: storage.storageAccountAddress,
        signAndSubmitTransaction: storage.signAndSubmitTransaction,
      },
      blobs: [{ blobData: data, blobName }],
    });
    return blobName;
  };

  return {
    client,
    storageAccountAddress: storage.storageAccountAddress
      ? AccountAddress.from(storage.storageAccountAddress).toString()
      : null,
    signAndSubmitTransaction: storage.signAndSubmitTransaction,
    upload,
    isReady: Boolean(storage.storageAccountAddress && storage.signAndSubmitTransaction),
    isUploading: uploadBlobs.isPending,
  };
}
