// Types
import { toEthTx } from "./types/transaction.ts";
import { toEthReceipt } from "./types/receipt.ts";
import { JsonRpcLog, toEthLog } from "./types/log.ts";
import { StoreItem } from "./types/storeItem.ts";
// Starknet
import { BlockHeader, EventWithTransaction, hash } from "./deps.ts";

const AUTH_TOKEN = Deno.env.get("APIBARA_AUTH_TOKEN") ?? "";
const TRANSACTION_EXECUTED = hash.getSelectorFromName(
  "transaction_executed",
);

export const config = {
  streamUrl: "https://goerli.starknet.a5a.ch",
  authToken: AUTH_TOKEN,
  startingBlock: 930_793,
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

export default function transform({
  header,
  events,
}: {
  header: BlockHeader;
  events: EventWithTransaction[];
}) {
  // Accumulate the gas used in the block in order to calculate the cumulative gas used.
  // We increment it by the gas used in each transaction in the flatMap iteration.
  let cumulativeGasUsed = 0n;

  return (events ?? []).flatMap(({ transaction, receipt, event }) => {
    const store: Array<StoreItem> = [];

    const ethTx = toEthTx({ transaction, header, receipt });
    // Can be null if:
    // 1. The transaction is missing calldata.
    // 2. The transaction is a multi-call.
    // 3. The length of the signature array is different from 5.
    // 4. The chain id is not encoded in the v param of the signature for a
    //    Legacy transaction.
    // 5. The deserialization of the transaction fails.
    if (ethTx === null) {
      return [];
    }
    store.push({ collection: "transactions", data: { tx: ethTx } });

    // Can be null if:
    // 1. The event is part of the defined ignored events (see IGNORED_KEYS).
    // 2. The event has an invalid number of keys.
    const ethLogs = receipt.events.map((e) => {
      return toEthLog({ transaction: ethTx, event: e });
    }).filter((e) => e !== null) as JsonRpcLog[];
    ethLogs.forEach((ethLog) => {
      store.push({ collection: "logs", data: { log: ethLog } });
    });

    const ethReceipt = toEthReceipt({
      transaction: ethTx,
      logs: ethLogs,
      event,
      cumulativeGasUsed,
    });
    store.push({ collection: "receipts", data: { receipt: ethReceipt } });
    cumulativeGasUsed += BigInt(ethReceipt.gasUsed);

    return store;
  });
}
