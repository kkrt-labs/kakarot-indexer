// Eth
import { bigIntToHex, bytesToHex } from "../deps.ts";
import { PrefixedHexString, stripHexPrefix } from "../deps.ts";

/**
 * @param hex - A decimal string.
 */
export function toHexString(decimal: string | undefined): PrefixedHexString {
  if (decimal === undefined) {
    return "0x";
  }
  return bigIntToHex(BigInt(decimal));
}

/**
 * @param hex - A hex string.
 * @param length - The final length in bytes of the hex string.
 */
export function padString(
  hex: PrefixedHexString | undefined,
  length: number,
): PrefixedHexString {
  return "0x" + (stripHexPrefix(hex ?? "0x").padStart(2 * length, "0"));
}

/**
 * @param b - A bigint.
 * @param length - The final length in bytes of the hex string.
 */
export function padBigint(
  b: bigint | undefined,
  length: number,
): PrefixedHexString {
  return "0x" +
    (stripHexPrefix(bigIntToHex(b ?? 0n)).padStart(2 * length, "0"));
}

/**
 * @param bytes - A Uint8Array.
 * @param length - The final length in bytes of the array. If
 * the array is longer than the length, it is returned as is.
 */
export function padBytes(
  bytes: Uint8Array | undefined,
  length: number,
): PrefixedHexString {
  const bytesNew = bytes ?? new Uint8Array();
  if (bytesNew.length > length) {
    return bytesToHex(bytesNew);
  }
  const result = new Uint8Array(length);
  result.set(bytesNew, length - bytesNew.length);
  return bytesToHex(result);
}
