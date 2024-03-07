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
import { KAKAROT } from "../provider.ts";

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
export async function toEthHeader({
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
}): Promise<JsonRpcBlock> {
  const maybeTs = Date.parse(header.timestamp);
  const ts = isNaN(maybeTs) ? 0 : Math.floor(maybeTs / 1000);

  if (header.timestamp === undefined || isNaN(maybeTs)) {
    console.error(
      `⚠️ Block timestamp is ${header.timestamp}, Date.parse of this is invalid - Block timestamp will be set to 0.`,
    );
  }

  const { coinbase } = (await KAKAROT.call("get_coinbase", [], {
    // ⚠️ StarknetJS: blockIdentifier is a block hash if value is BigInt or HexString, otherwise it's a block number.
    blockIdentifier: BigInt(blockNumber).toString(),
  })) as {
    coinbase: bigint;
  };
  const { base_fee: baseFee } = (await KAKAROT.call("get_base_fee", [], {
    // ⚠️ StarknetJS: blockIdentifier is a block hash if value is BigInt or HexString, otherwise it's a block number.
    blockIdentifier: BigInt(blockNumber).toString(),
  })) as {
    base_fee: bigint;
  };
  const { block_gas_limit: blockGasLimit } = (await KAKAROT.call(
    "get_block_gas_limit",
    [],
    {
      // ⚠️ StarknetJS: blockIdentifier is a block hash if value is BigInt or HexString, otherwise it's a block number.
      blockIdentifier: BigInt(blockNumber).toString(),
    },
  )) as {
    block_gas_limit: bigint;
  };

  return {
    number: blockNumber,
    hash: blockHash,
    parentHash: padString(header.parentBlockHash, 32),
    mixHash: padString("0x", 32),
    nonce: padString("0x", 8),
    // Empty list of uncles -> RLP encoded to 0xC0 -> Keccak(0xc0) == 0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347
    sha3Uncles:
      "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
    logsBloom: bytesToHex(logsBloom.bitvector),
    transactionsRoot: bytesToHex(transactionRoot),
    stateRoot: header.newRoot ?? padString("0x", 32),
    receiptsRoot: bytesToHex(receiptRoot),
    miner: bigIntToHex(coinbase),
    difficulty: "0x00",
    totalDifficulty: "0x00",
    extraData: "0x",
    size: "0x00",
    gasLimit: bigIntToHex(blockGasLimit),
    gasUsed: bigIntToHex(gasUsed),
    timestamp: bigIntToHex(BigInt(ts)),
    transactions: [], // we are using this structure to represent a Kakarot block header, so we don't need to include transactions
    uncles: [],
    withdrawals: [],
    // Root hash of an empty trie.
    // <https://github.com/paradigmxyz/reth/blob/main/crates/primitives/src/constants/mod.rs#L138>
    withdrawalsRoot:
      "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
    baseFeePerGas: bigIntToHex(baseFee),
  };
}
