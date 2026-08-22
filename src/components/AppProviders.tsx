import { PrivyProvider } from "@privy-io/react-auth";
import { ShelbyClientProvider } from "@shelby-protocol/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { mainnet } from "viem/chains";
import { createShelbyClient } from "@/lib/shelby";
import { PRIVY_APP_ID, SHELBY_CHAIN_ID } from "@/lib/config";
import { ThemeProvider } from "./ThemeProvider";
import { ShelbyAccountProvisioner } from "./ShelbyAccountProvisioner";

export function AppProviders({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <ThemeProvider>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ["email"],
          embeddedWallets: {
            ethereum: { createOnLogin: "all-users" },
            showWalletUIs: false,
          },
          supportedChains: [mainnet],
          appearance: {
            theme: "light",
            accentColor: "#ff037c",
            logo: "/logo.svg",
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <ShelbyClientProvider client={createShelbyClient(SHELBY_CHAIN_ID)}>
            <ShelbyAccountProvisioner />
            {children}
          </ShelbyClientProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </ThemeProvider>
  );
}
