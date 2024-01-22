// Types
import { toEthTx, toTypedEthTx } from "./types/transaction.ts";
import { toEthHeader } from "./types/header.ts";
import { fromJsonRpcReceipt, toEthReceipt } from "./types/receipt.ts";
import { JsonRpcLog, toEthLog } from "./types/log.ts";
import { StoreItem } from "./types/storeItem.ts";
// Starknet
import { BlockHeader, EventWithTransaction, hash } from "./deps.ts";
// Eth
import { Bloom, encodeReceipt, hexToBytes, RLP, Trie } from "./deps.ts";

const AUTH_TOKEN = Deno.env.get("APIBARA_AUTH_TOKEN") ?? "";
const TRANSACTION_EXECUTED = hash.getSelectorFromName(
  "transaction_executed",
);

export const config = {
  streamUrl: "https://goerli.starknet.a5a.ch",
  authToken: AUTH_TOKEN,
  startingBlock: 934875,
  network: "starknet",
  filter: {
    header: { weak: true },
    // Filters are unions
    events: [
      {
        keys: [TRANSACTION_EXECUTED],
      },
    ],
  },
  sinkType: "console",
  sinkOptions: {},
};

export default async function transform({
  header,
  events,
}: {
  header: BlockHeader;
  events: EventWithTransaction[];
}) {
  // Accumulate the gas used in the block in order to calculate the cumulative gas used.
  // We increment it by the gas used in each transaction in the flatMap iteration.
  let cumulativeGasUsed = 0n;
  const blockLogsBloom = new Bloom();
  const transactionTrie = new Trie();
  const receiptTrie = new Trie();

  const store: Array<StoreItem> = [];

  (events ?? []).forEach(async ({ transaction, receipt, event }, i) => {
    const typedEthTx = toTypedEthTx({ transaction });
    // Can be null if:
    // 1. The transaction is missing calldata.
    // 2. The transaction is a multi-call.
    // 3. The length of the signature array is different from 5.
    // 4. The chain id is not encoded in the v param of the signature for a
    //    Legacy transaction.
    // 5. The deserialization of the transaction fails.
    if (typedEthTx === null) {
      return null;
    }
    const ethTx = toEthTx({ transaction: typedEthTx, header, receipt });

    // Can be null if:
    // 1. The event is part of the defined ignored events (see IGNORED_KEYS).
    // 2. The event has an invalid number of keys.
    //
    const ethLogs = receipt.events.map((e) => {
      return toEthLog({ transaction: ethTx, event: e });
    }).filter((e) => e !== null) as JsonRpcLog[];

    const ethReceipt = toEthReceipt({
      transaction: ethTx,
      logs: ethLogs,
      event,
      cumulativeGasUsed,
    });

    // Add the transaction to the transaction trie.
    await transactionTrie.put(RLP.encode(i), typedEthTx.serialize());
    // Add the receipt to the receipt trie.
    const encodedReceipt = encodeReceipt(
      fromJsonRpcReceipt(ethReceipt),
      typedEthTx.type,
    );
    await receiptTrie.put(RLP.encode(i), encodedReceipt);
    // Add the logs bloom of the receipt to the block logs bloom.
    const receiptBloom = new Bloom(hexToBytes(ethReceipt.logsBloom));
    blockLogsBloom.or(receiptBloom);
    cumulativeGasUsed += BigInt(ethReceipt.gasUsed);

    // Add all the eth data to the store.
    store.push({ collection: "transactions", data: { tx: ethTx } });
    store.push({ collection: "receipts", data: { receipt: ethReceipt } });
    ethLogs.forEach((ethLog) => {
      store.push({ collection: "logs", data: { log: ethLog } });
    });
  });

  const ethHeader = await toEthHeader({
    header: header,
    gasUsed: cumulativeGasUsed,
    logsBloom: blockLogsBloom,
    receiptRoot: receiptTrie.root(),
    transactionRoot: transactionTrie.root(),
  });
  store.push({ collection: "headers", data: { header: ethHeader } });
  return store;
}
