/**
 * Random id. Not crypto.randomUUID(): that is missing on plain-http LAN
 * addresses (e.g. testing on a phone via http://192.168.x.x).
 */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
