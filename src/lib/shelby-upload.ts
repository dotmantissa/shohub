export const BLOB_LIFETIME_MICROS = 30 * 24 * 60 * 60 * 1_000_000;

export function blobExpirationMicros(nowMillis = Date.now()) {
  return nowMillis * 1000 + BLOB_LIFETIME_MICROS;
}
