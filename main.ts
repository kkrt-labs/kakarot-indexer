import { hash, uint256 } from "https://esm.sh/starknet";
import {
  BlockHeader,
  EventWithTransaction,
} from "https://esm.sh/@apibara/indexer/starknet";
import {
  getAddress,
  keccak256,
  parseTransaction,
  serializeTransaction,
  toHex,
} from "https://esm.sh/viem";

const TRANSACTION_EXECUTED = hash.getSelectorFromName(
  "transaction_executed",
) as `0x${string}`;

export const config = {
  streamUrl: "https://goerli.starknet.a5a.ch",
  startingBlock: 930_000,
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

export default function transform(
  { header, events }: { header: BlockHeader; events: EventWithTransaction[] },
) {
  return (events ?? []).flatMap(({ transaction }) => {
    const calldata = transaction.invokeV1?.calldata;
    if (!calldata) return [];
    const callArrayLen = BigInt(calldata[0]);
    if (callArrayLen !== 1n) {
      console.error("Unexpected call array length");
      return [];
    }

    const starknetTxHash = transaction.meta.hash;

    // to <- calldata[1]
    // selector <- calldata[2];
    // dataOffset <- calldata[3]
    // dataLength <- calldata[4]
    // calldataLen <- calldata[5]
    const bytes = calldata
      .slice(6)
      .map((x) => BigInt(x).toString(16).padStart(2, "0"))
      .join("");

    const signature = transaction.meta.signature;
    const r = toHex(
      uint256.uint256ToBN({ high: signature[0], low: signature[1] }),
    );
    const s = toHex(
      uint256.uint256ToBN({ high: signature[2], low: signature[3] }),
    );
    const v = BigInt(signature[4]);

    const ethTx = parseTransaction(`0x${bytes}`);
    const serializedTx = serializeTransaction(ethTx, { r, s, v });
    const ethTxHash = keccak256(serializedTx);

    return [{
      collection: "transactions",
      data: {
        starknetTxHash,
        ethTxHash,
        serializedTx,
      },
    }, {
      collection: "receipts",
      data: {
        starknetTxHash,
        ethTxHash,
        serializedTx,
      },
    }];
  });
}
