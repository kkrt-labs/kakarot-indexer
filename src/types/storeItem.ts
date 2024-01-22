// Types
import { JsonRpcLog } from "./log.ts";
import { JsonRpcReceipt } from "./receipt.ts";

// Eth
import { JsonHeader, JsonRpcTx } from "../deps.ts";

type Collection =
  | "transactions"
  | "logs"
  | "receipts"
  | "headers";

export type StoreItem<C = Collection> = {
  collection: C;
  data: C extends "transactions" ? { tx: JsonRpcTx }
    : C extends "logs" ? { log: JsonRpcLog }
    : C extends "receipts" ? { receipt: JsonRpcReceipt }
    : { header: JsonHeader };
};
