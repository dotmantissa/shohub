import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { useShelbyStorage } from "@/hooks/useShelby";
import { provisionShelbyAccount } from "@/lib/server";

const MAX_ATTEMPTS = 4;

export function ShelbyAccountProvisioner() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const storage = useShelbyStorage();
  const [attempt, setAttempt] = useState(0);
  const activeKey = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      activeKey.current = null;
      setAttempt(0);
      return;
    }
    if (!ready || !storage.storageAccountAddress || attempt >= MAX_ATTEMPTS) return;

    const key = `${storage.storageAccountAddress}:${window.location.host}`;
    if (activeKey.current === key) return;
    activeKey.current = key;
    let cancelled = false;

    void getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) throw new Error("Your email session expired.");
        await provisionShelbyAccount({
          data: {
            accessToken,
            storageAccountAddress: storage.storageAccountAddress!,
            domain: window.location.host,
          },
        });
      })
      .catch((error) => {
        console.error("Shelby account provisioning failed", error);
        if (cancelled) return;
        activeKey.current = null;
        window.setTimeout(
          () => {
            if (!cancelled) setAttempt((value) => value + 1);
          },
          1_500 * (attempt + 1),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, authenticated, getAccessToken, ready, storage.storageAccountAddress]);

  return null;
}
