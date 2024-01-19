// Types
import { toEthTx } from "./types/transaction.ts";
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
  return (events ?? []).flatMap(({ transaction, receipt }) => {
    const store: Array<StoreItem> = [];

    const ethTx = toEthTx({ transaction, header, receipt });
    if (ethTx === null) {
      return [];
    }
    store.push({ collection: "transactions", data: { tx: ethTx } });

    const ethLogs = receipt.events.map((e) => {
      return toEthLog({ transaction: ethTx, event: e });
    }).filter((e) => e !== null) as JsonRpcLog[];
    ethLogs.forEach((ethLog) => {
      store.push({ collection: "logs", data: { log: ethLog } });
    });

    return store;
  });
}
