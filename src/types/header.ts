// Utils
import { padString } from "../utils/hex.ts";

// Starknet
import { BlockHeader } from "../deps.ts";

// Eth
import {
  bigIntToHex,
  Bloom,
  bytesToHex,
  JsonRpcBlock,
  PrefixedHexString,
} from "../deps.ts";

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
const COINBASE = padString("0xabde1", 20);

/**
 * @param header - A Starknet block header.
 * @param blockNumber - The block number of the transaction in hex.
 * @param blockHash - The block hash of the transaction in hex.
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
export function toEthHeader({
  header,
  blockNumber,
  blockHash,
  gasUsed,
  logsBloom,
  receiptRoot,
  transactionRoot,
}: {
  header: BlockHeader;
  blockNumber: PrefixedHexString;
  blockHash: PrefixedHexString;
  gasUsed: bigint;
  logsBloom: Bloom;
  receiptRoot: Uint8Array;
  transactionRoot: Uint8Array;
}): JsonRpcBlock {
  const maybeTs = Date.parse(header.timestamp);
  const ts = isNaN(maybeTs) ? 0 : Math.floor(maybeTs / 1000);

  if (header.timestamp === undefined || isNaN(maybeTs)) {
    console.error(
      `⚠️ Block timestamp is ${header.timestamp}, Date.parse of this is invalid - Block timestamp will be set to 0.`,
    );
  }

  return {
    number: blockNumber,
    hash: blockHash,
    parentHash: padString(header.parentBlockHash, 32),
    mixHash: padString("0x", 32),
    nonce: padString("0x", 8),
    // Empty list of uncles -> RLP encoded to 0xC0 -> Keccak(0xc0) == 0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347
    sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
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
