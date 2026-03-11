// AES-GCM encryption with PBKDF2 key derivation
// All crypto is done via the Web Crypto API (no third-party libs)

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function b64Encode(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
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

// ── Binary format (v1) ───────────────────────────────────────────────────────
// [1 byte: version=1][16 bytes: salt][12 bytes: IV][...ciphertext]
// ~1× vault size vs the old base64-of-base64-JSON which was ~3.4×

const BINARY_VERSION = 1;

export function serializeBlobBinary(blob: EncryptedBlob): Uint8Array {
  const salt = b64Decode(blob.salt);
  const iv   = b64Decode(blob.iv);
  const ct   = b64Decode(blob.ct);
  const out  = new Uint8Array(1 + SALT_BYTES + IV_BYTES + ct.byteLength);
  out[0] = BINARY_VERSION;
  out.set(salt, 1);
  out.set(iv,   1 + SALT_BYTES);
  out.set(ct,   1 + SALT_BYTES + IV_BYTES);
  return out;
}

export function deserializeBlobBinary(buf: Uint8Array): EncryptedBlob {
  if (buf[0] !== BINARY_VERSION) throw new Error("Unknown vault version");
  return {
    salt: b64Encode(buf.slice(1, 1 + SALT_BYTES)),
    iv:   b64Encode(buf.slice(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES)),
    ct:   b64Encode(buf.slice(1 + SALT_BYTES + IV_BYTES)),
  };
}

// ── Legacy text format ────────────────────────────────────────────────────────
// Kept for opening old vaults pasted as text.

export function deserializeBlob(raw: string): EncryptedBlob {
  return JSON.parse(atob(raw.trim()));
}
