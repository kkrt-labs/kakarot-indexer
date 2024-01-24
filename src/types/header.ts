// Starknet
import { BlockHeader } from "../deps.ts";

// Eth
import { bigIntToHex, Bloom, bytesToHex, JsonRpcBlock } from "../deps.ts";

/**
 * The gas limit of a Kakarot Ethereum block.
 * The gas limit for now is arbitrarily set to 30,000,000
 * and should be adjusted in the future based on the
 * first Kakarot testnet.
 * @todo Update this value after the first Kakarot testnet.
 */
const BLOCK_GAS_LIMIT = 30_000_000n;

/**
 * The base fee per gas of a Kakarot Ethereum block.
 * Since Kakarot does not have a fee market, the base fee
 * per gas should currently be the Starknet gas price.
 * Since this field is not present in the Starknet
 * block header, we arbitrarily set it to 100 Gwei.
 * @todo Update this value after the first Kakarot testnet.
 */
const BASE_FEE_PER_GAS = 100_000_000_000n;

/**
 * The Kakarot Ethereum coinbase. Needs to be updated with
 * the actual Kakarot corresponding Sequencer Ethereum
 * address.
 * @todo Update this value BEFORE the first Kakarot testnet.
 */
const COINBASE = "0xabde1".padEnd(42, "0");

/**
 * @param header - A Starknet block header.
 * @param gasUsed - The total gas used in the block.
 * @param logsBloom - The logs bloom of the block.
 * @param receiptRoot - The transaction receipt trie root of the block.
 * @param transactionRoot - The transaction trie root of the block.
 * @returns The Ethereum block header in the json RPC format.
 *
 * Note: We return a JsonRpcBlock instead of a JsonHeader, since the
 * JsonHeader from the ethereumjs-mono repo does not follow the
 * Ethereum json RPC format for certain fields and is used as an
 * internal type.
 */
export function toEthHeader(
  { header, gasUsed, logsBloom, receiptRoot, transactionRoot }: {
    header: BlockHeader;
    gasUsed: bigint;
    logsBloom: Bloom;
    receiptRoot: Uint8Array;
    transactionRoot: Uint8Array;
  },
): JsonRpcBlock {
  const maybeTs = Date.parse(header.timestamp);
  const ts = isNaN(maybeTs) ? 0 : maybeTs;

  return {
    number: header.blockNumber,
    hash: header.blockHash,
    parentHash: header.parentBlockHash,
    mixHash: "0x".padEnd(66, "0"),
    nonce: "0x".padEnd(18, "0"),
    sha3Uncles: "0x".padEnd(66, "0"),
    logsBloom: bytesToHex(logsBloom.bitvector),
    transactionsRoot: bytesToHex(transactionRoot),
    stateRoot: header.newRoot,
    receiptsRoot: bytesToHex(receiptRoot),
    miner: COINBASE,
    difficulty: "0x00",
    totalDifficulty: "0x00",
    extraData: "0x",
    size: "0x00",
    gasLimit: bigIntToHex(BLOCK_GAS_LIMIT),
    gasUsed: bigIntToHex(gasUsed),
    timestamp: bigIntToHex(BigInt(ts)),
    transactions: [], // we are using this structure to represent a Kakarot block header, so we don't need to include transactions
    uncles: [],
    baseFeePerGas: bigIntToHex(BASE_FEE_PER_GAS), // TBD
  };
}
