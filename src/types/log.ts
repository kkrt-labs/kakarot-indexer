// Transaction
import { JsonRpcTx } from "../deps.ts";

// Starknet
import { Event, hash } from "../deps.ts";

// Eth
import { bigIntToHex } from "../deps.ts";

const IGNORED_KEYS = [
  hash.getSelectorFromName("transaction_executed"),
  hash.getSelectorFromName("evm_contract_deployed"),
  hash.getSelectorFromName("Transfer"),
  hash.getSelectorFromName("Approval"),
];

/**
 * @param transaction A Ethereum transaction.
 * @param event A Starknet event.
 * @returns The log in the Ethereum format, or null if the log is invalid.
 */
export function toEthLog(
  { transaction, event }: {
    transaction: JsonRpcTx;
    event: Event;
  },
): JsonRpcLog | null {
  // Filter out ignored events which aren't ETH logs.
  if (IGNORED_KEYS.includes(event.keys[0])) {
    return null;
  }

  if (event.keys.length < 1 || event.keys.length % 2 !== 1) {
    console.error(`Invalid event ${event}`);
    return null;
  }

  // The address is the first key of the event.
  const address = bigIntToHex(BigInt(event.keys[0]));
  const data = event.data.map((d) => BigInt(d).toString(16).padStart(2, "0"))
    .join("");
  const topics: string[] = [];
  for (let i = 1; i < event.keys.length; i += 2) {
    // Topics are split tinto twos keys.
    topics[Math.floor(i / 2)] = bigIntToHex(
      BigInt(event.keys[i + 1]) << 128n + BigInt(event.keys[i]),
    );
  }
  return {
    removed: false,
    logIndex: event.index.toString(),
    transactionIndex: transaction.transactionIndex,
    transactionHash: transaction.hash,
    blockHash: transaction.blockHash,
    blockNumber: transaction.blockNumber,
    address,
    data,
    topics,
  };
}

/**
 * Acknowledgement: Code taken from <https://github.com/ethereumjs/ethereumjs-monorepo>
 */
export type JsonRpcLog = {
  removed: boolean; // TAG - true when the log was removed, due to a chain reorganization. false if it's a valid log.
  logIndex: string | null; // QUANTITY - integer of the log index position in the block. null when it's pending.
  transactionIndex: string | null; // QUANTITY - integer of the transactions index position log was created from. null when it's pending.
  transactionHash: string | null; // DATA, 32 Bytes - hash of the transactions this log was created from. null when it's pending.
  blockHash: string | null; // DATA, 32 Bytes - hash of the block where this log was in. null when it's pending.
  blockNumber: string | null; // QUANTITY - the block number where this log was in. null when it's pending.
  address: string; // DATA, 20 Bytes - address from which this log originated.
  data: string; // DATA - contains one or more 32 Bytes non-indexed arguments of the log.
  topics: string[]; // Array of DATA - Array of 0 to 4 32 Bytes DATA of indexed log arguments.
  // (In solidity: The first topic is the hash of the signature of the event
  // (e.g. Deposit(address,bytes32,uint256)), except you declared the event with the anonymous specifier.)
};
