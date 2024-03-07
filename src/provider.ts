import { Contract, RpcProvider } from "./deps.ts";

const RPC_URL = Deno.env.get("STARKNET_NETWORK");
if (RPC_URL === undefined) {
  throw new Error("ENV: STARKNET_NETWORK is not set");
}

const KAKAROT_ADDRESS = Deno.env.get("KAKAROT_ADDRESS");
if (KAKAROT_ADDRESS === undefined) {
  throw new Error("ENV: KAKAROT_ADDRESS is not set");
}

export const PROVIDER = new RpcProvider({
  nodeUrl: RPC_URL,
});

const { abi } = await PROVIDER.getClassByHash(KAKAROT_ADDRESS);
if (abi === undefined) {
  throw new Error("Provider Error: Cannot get ABI of Kakarot contract");
}
export const KAKAROT = new Contract(abi, KAKAROT_ADDRESS, PROVIDER);
