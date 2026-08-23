import { provisionShelbyAccount } from "./server";

type ProvisioningInput = {
  accessToken: string;
  storageAccountAddress: string;
  domain: string;
};

const activeProvisioning = new Map<
  string,
  Promise<Awaited<ReturnType<typeof provisionShelbyAccount>>>
>();

export function ensureShelbyAccountProvisioned(input: ProvisioningInput) {
  const key = `${input.storageAccountAddress}:${input.domain}`;
  const active = activeProvisioning.get(key);
  if (active) return active;

  const pending = provisionShelbyAccount({ data: input }).finally(() => {
    activeProvisioning.delete(key);
  });
  activeProvisioning.set(key, pending);
  return pending;
}
