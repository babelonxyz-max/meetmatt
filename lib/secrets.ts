import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

function parseKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const base64Buffer = Buffer.from(trimmed, "base64");
  if (base64Buffer.length === 32) {
    return base64Buffer;
  }

  throw new Error(
    "[Secrets] MEETMATT_SECRET_ENCRYPTION_KEY must be 32 bytes encoded as base64 or 64-char hex",
  );
}

function getEncryptionKey(): Buffer {
  const rawKey = process.env.MEETMATT_SECRET_ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    if (BUILD_PHASE) {
      return Buffer.alloc(32, 0);
    }

    throw new Error(
      "[Secrets] MEETMATT_SECRET_ENCRYPTION_KEY is required outside build phase",
    );
  }

  return parseKey(rawKey);
}

export function isEncryptedSecret(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptSecret(value?: string | null): string | null {
  const plaintext = value?.trim() || "";
  if (!plaintext) {
    return null;
  }

  if (isEncryptedSecret(plaintext)) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(value?: string | null): string | null {
  const stored = value?.trim() || "";
  if (!stored) {
    return null;
  }

  if (!isEncryptedSecret(stored)) {
    throw new Error("[Secrets] Attempted to decrypt a legacy plaintext secret");
  }

  const payload = stored.slice(ENCRYPTION_PREFIX.length);
  const [ivPart, authTagPart, ciphertextPart] = payload.split(".");
  if (!ivPart || !authTagPart || !ciphertextPart) {
    throw new Error("[Secrets] Encrypted secret is malformed");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function readStoredSecret(
  value?: string | null,
  options?: { allowLegacyPlaintext?: boolean },
): string | null {
  const stored = value?.trim() || "";
  if (!stored) {
    return null;
  }

  if (isEncryptedSecret(stored)) {
    return decryptSecret(stored);
  }

  if (options?.allowLegacyPlaintext === true) {
    return stored;
  }

  throw new Error("[Secrets] Legacy plaintext secret is not allowed");
}
