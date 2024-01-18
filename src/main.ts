// Util
import { addSignature, toJsonRpcTx } from "./utils/transaction.ts";
// Starknet
import { BlockHeader, EventWithTransaction, hash, uint256 } from "./deps.ts";
// Ethereum
import { bigIntToBytes, concatBytes, TransactionFactory } from "./deps.ts";

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
      // This event is emitted when a transaction is executed in Kakarot, by an EOA.
      // ⚠️ If there are two Kakarots deployed, events will collide
      // If someone deploys a contract that emits this event, it will be picked up (get poisoned)
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
    const calldata = transaction.invokeV1?.calldata;
    if (!calldata) {
      console.error("No calldata");
      return [];
    }
    const callArrayLen = BigInt(calldata[0]);
    if (callArrayLen !== 1n) {
      console.error(`Invalid call array length ${callArrayLen}`);
      return [];
    }

    // callArrayLen <- calldata[0]
    // to <- calldata[1]
    // selector <- calldata[2];
    // dataOffset <- calldata[3]
    // dataLength <- calldata[4]
    // calldataLen <- calldata[5]
    const bytes = concatBytes(
      ...calldata
        .slice(6)
        .map((x) => bigIntToBytes(BigInt(x))),
    );

    const signature = transaction.meta.signature;
    if (signature.length !== 5) {
      console.error(`Invalid signature length ${signature.length}`);
      return [];
    }
    const r = uint256.uint256ToBN({ high: signature[1], low: signature[0] });
    const s = uint256.uint256ToBN({ high: signature[3], low: signature[2] });
    const v = BigInt(signature[4]);

    try {
      const ethTxUnsigned = TransactionFactory.fromSerializedData(bytes, {
        freeze: false,
      });
      const ethTx = addSignature(ethTxUnsigned, r, s, v);

      const blockHash = header.blockHash;
      const blockNumber = header.blockNumber;
      const index = receipt.transactionIndex;

      const JsonRpcTx = toJsonRpcTx(ethTx, blockHash, blockNumber, index);

      return {
        collection: "transactions",
        data: {
          tx: JsonRpcTx,
        },
      };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Invalid transaction: ${e.message}`);
      } else {
        console.error(`Unknown throw ${e}`);
        throw e;
      }
      // TODO: Ping alert webhooks
      return [];
    }
  });
}
