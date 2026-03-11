// AES-GCM encryption with PBKDF2 key derivation
// All crypto is done via the Web Crypto API (no third-party libs)

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function b64Encode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function b64Decode(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedBlob {
  salt: string; // base64
  iv: string;   // base64
  ct: string;   // base64 ciphertext
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return {
    salt: b64Encode(salt),
    iv: b64Encode(iv),
    ct: b64Encode(new Uint8Array(ciphertext)),
  };
}

export async function decrypt(blob: EncryptedBlob, password: string): Promise<string> {
  const salt = b64Decode(blob.salt);
  const iv = b64Decode(blob.iv);
  const ct = b64Decode(blob.ct);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plain);
}

export function serializeBlob(blob: EncryptedBlob): string {
  return btoa(JSON.stringify(blob));
}

export function deserializeBlob(raw: string): EncryptedBlob {
  return JSON.parse(atob(raw.trim()));
}
