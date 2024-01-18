// Types
import { JsonRpcLog } from "./log.ts";
import { JsonRpcReceipt } from "./receipt.ts";

// Eth
import { JsonRpcTx } from "../deps.ts";

type Collection =
  | "transactions"
  | "logs"
  | "receipts";

export type StoreItem<C = Collection> = {
  collection: C;
  data: C extends "transactions" ? { tx: JsonRpcTx }
    : C extends "logs" ? { log: JsonRpcLog }
    : { receipt: JsonRpcReceipt };
};
