import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";

import {
  createBundlerClient,
  createPaymasterClient,
} from "viem/account-abstraction";

import {
  NETWORK_TO_COINBASE_PAYMASTER_URL,
  NETWORK_TO_ENDPOINT,
} from "../../constants";

export const v06EntrypointAddress = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789";

type IPaymasterNetwork = "base-sepolia" | "base";

export const baseSepoliaPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(NETWORK_TO_ENDPOINT["base-sepolia"]),
})

export const basePublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(NETWORK_TO_ENDPOINT["base"]),
})

export const newBundlerClient = (account: `0x${string}`, network: IPaymasterNetwork) => {
  let transportUrl = NETWORK_TO_COINBASE_PAYMASTER_URL[network];
  let chain = network === "base" ? base : baseSepolia;
  let publicClient = network === "base" ? basePublicClient : baseSepoliaPublicClient;
  return createBundlerClient({
    account,
    client: publicClient,
    transport: http(transportUrl),
    // entryPoint: v06EntrypointAddress,
    chain: chain,
  });
}
 
export const newPaymasterClient = (network: IPaymasterNetwork) => {
  let paymasterUrl = NETWORK_TO_COINBASE_PAYMASTER_URL[network];
  return createPaymasterClient({
    transport: http(paymasterUrl),
  });
}