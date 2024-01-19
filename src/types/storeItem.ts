// Types
import { JsonRpcLog } from "./log.ts";

// Eth
import { JsonRpcTx } from "../deps.ts";

type Collection =
  | "transactions"
  | "logs";

export type StoreItem<C = Collection> = {
  collection: C;
  data: C extends "transactions" ? { tx: JsonRpcTx } : { log: JsonRpcLog };
};
