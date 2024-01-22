// Starknet
import { BlockHeader } from "../deps.ts";

// Eth
import { bigIntToHex, Bloom, bytesToHex, JsonHeader } from "../deps.ts";

const BLOCK_GAS_LIMIT = 30_000_000n;
const BASE_FEE_PER_GAS = 100_000_000_000n;

/**
 * @param header - A Starknet block header.
 * @param gasUsed - The total gas used in the block.
 * @param logsBloom - The logs bloom of the block.
 * @param receiptRoot - The transaction receipt trie root of the block.
 * @param transactionRoot - The transaction trie root of the block.
 * @returns The Ethereum block header in the json RPC format.
 */
export function toEthHeader(
  { header, gasUsed, logsBloom, receiptRoot, transactionRoot }: {
    header: BlockHeader;
    gasUsed: bigint;
    logsBloom: Bloom;
    receiptRoot: Uint8Array;
    transactionRoot: Uint8Array;
  },
): JsonHeader {
  return {
    parentHash: header.parentBlockHash,
    uncleHash: "0x",
    coinbase: header.sequencerAddress,
    stateRoot: header.newRoot,
    transactionsTrie: bytesToHex(transactionRoot),
    receiptTrie: bytesToHex(receiptRoot),
    logsBloom: bytesToHex(logsBloom.bitvector),
    difficulty: "0x0",
    number: header.blockNumber,
    gasLimit: bigIntToHex(BLOCK_GAS_LIMIT),
    gasUsed: bigIntToHex(gasUsed),
    timestamp: header.timestamp,
    extraData: "0x",
    mixHash: "0x",
    nonce: undefined,
    baseFeePerGas: bigIntToHex(BASE_FEE_PER_GAS), // TBD
  };
}
