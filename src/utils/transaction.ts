import { JsonRpcTx } from "../deps.ts";
import {
  AccessListBytes,
  AccessListEIP2930Transaction,
  bigIntToHex,
  bytesToHex,
  FeeMarketEIP1559Transaction,
  isAccessListEIP2930Tx,
  isFeeMarketEIP1559TxData,
  isLegacyTx,
  LegacyTransaction,
  TransactionFactory,
  TypedTransaction,
  TypedTxData,
} from "../deps.ts";

/**
 * @param tx Typed transaction to be signed.
 * @param r Signature r value.
 * @param s Signature s value.
 * @param v Signature v value. In case of EIP155ReplayProtection, must include the chain ID.
 * @returns Passed transaction with the signature added.
 * @throws Error if the transaction is a BlobEIP4844Tx or if v param is < 35 for a
 *         LegacyTx.
 */
export function addSignature(
  tx: TypedTransaction,
  r: bigint,
  s: bigint,
  v: bigint,
): TypedTransaction {
  const TypedTxData = ((): TypedTxData => {
    if (isLegacyTx(tx)) {
      if (v < 35) {
        throw new Error(`Invalid v value: ${v}`);
      }
      return LegacyTransaction.fromTxData({
        nonce: tx.nonce,
        gasPrice: tx.gasPrice,
        gasLimit: tx.gasLimit,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        v,
        r,
        s,
      });
    } else if (isAccessListEIP2930Tx(tx)) {
      return AccessListEIP2930Transaction.fromTxData({
        chainId: tx.chainId,
        nonce: tx.nonce,
        gasPrice: tx.gasPrice,
        gasLimit: tx.gasLimit,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        accessList: tx.accessList,
        v,
        r,
        s,
      });
    } else if (isFeeMarketEIP1559TxData(tx)) {
      return FeeMarketEIP1559Transaction.fromTxData({
        chainId: tx.chainId,
        nonce: tx.nonce,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        maxFeePerGas: tx.maxFeePerGas,
        gasLimit: tx.gasLimit,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        accessList: tx.accessList,
        v,
        r,
        s,
      });
    } else {
      throw new Error(`Invalid transaction type: ${tx}`);
    }
  })();

  return TransactionFactory.fromTxData(
    TypedTxData,
  );
}

type Option<T> = T | null;

/**
 * @param tx Typed transaction to be converted.
 * @param blockHash Block hash of the transaction.
 * @param blockNumber Block number of the transaction.
 * @param index Index of the transaction in the block.
 * @param from Address of the transaction sender.
 *
 * @throws Error if the transaction is not signed.
 */
export function toJsonRpcTx(
  tx: TypedTransaction,
  blockHash: Option<string>,
  blockNumber: Option<string>,
  index: Option<string>,
  from: string,
): JsonRpcTx {
  const gas = bigIntToHex(tx.gasLimit);
  const gasPrice = bigIntToHex(((): bigint => {
    if (isFeeMarketEIP1559TxData(tx)) {
      return tx.maxFeePerGas;
    } else if (isAccessListEIP2930Tx(tx) || isLegacyTx(tx)) {
      return tx.gasPrice;
    }
    return 0n;
  })());
  const [maxFeePerGas, maxPriorityFeePerGas] =
    ((): [Option<bigint>, Option<bigint>] => {
      if (isFeeMarketEIP1559TxData(tx)) {
        return [tx.maxFeePerGas, tx.maxPriorityFeePerGas];
      }
      return [null, null];
    })();
  const maxFeePerGasJson = maxFeePerGas ? bigIntToHex(maxFeePerGas) : undefined;
  const maxPriorityFeePerGasJson = maxPriorityFeePerGas
    ? bigIntToHex(maxPriorityFeePerGas)
    : undefined;

  const type = tx.type.toString(10);
  const accessList = ((): AccessListBytes | undefined => {
    if (
      isAccessListEIP2930Tx(tx) || isFeeMarketEIP1559TxData(tx)
    ) {
      return tx.accessList;
    }
    return undefined;
  })();
  const accessListJson = accessList
    ? accessList.map((
      [address, storageKeys],
    ) => {
      return {
        address: bytesToHex(address),
        storageKeys: storageKeys.map(bytesToHex),
      };
    })
    : undefined;
  const chainId = bigIntToHex(((): bigint => {
    if (isLegacyTx(tx)) {
      if (!tx.v) {
        throw new Error("Invalid transaction signature: missing v");
      }
      return (tx.v - 35n) >> 2n;
    }
    return tx.chainId;
  })());
  const hash = bytesToHex(tx.hash());
  const input = bytesToHex(tx.data);
  const nonce = bigIntToHex(tx.nonce);
  const [r, s, v] = [tx.r, tx.s, tx.v].map((x) => bigIntToHex(x ?? 0n));
  const to = tx.to ? tx.to.toString() : null;
  const value = bigIntToHex(tx.value);

  return {
    blockHash,
    blockNumber,
    from,
    gas,
    gasPrice,
    maxFeePerGas: maxFeePerGasJson,
    maxPriorityFeePerGas: maxPriorityFeePerGasJson,
    type,
    accessList: accessListJson,
    chainId,
    hash,
    input,
    nonce,
    to,
    transactionIndex: index,
    v,
    r,
    s,
    value,
  };
}
