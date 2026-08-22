import type { InputEntryFunctionData, MoveFunctionId } from "@aptos-labs/ts-sdk";

function registryFunction(address: string, name: string): MoveFunctionId {
  return `${address}::registry::${name}` as MoveFunctionId;
}

export function initializeRegistryPayload(address: string): InputEntryFunctionData {
  return {
    function: registryFunction(address, "initialize"),
    functionArguments: [],
  };
}

export function registryStatusPayload(address: string, owner: string) {
  return {
    function: registryFunction(address, "is_initialized"),
    functionArguments: [owner],
  };
}

export function registerProjectPayload({
  address,
  projectId,
  name,
  category,
  metadataUri,
  createdAt,
}: {
  address: string;
  projectId: string;
  name: string;
  category: string;
  metadataUri: string;
  createdAt: number;
}): InputEntryFunctionData {
  return {
    function: registryFunction(address, "register_project"),
    functionArguments: [
      new TextEncoder().encode(projectId),
      name,
      category,
      metadataUri,
      createdAt,
    ],
  };
}
