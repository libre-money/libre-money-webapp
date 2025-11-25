export const IV_LENGTH = 12;
export const SALT_LENGTH = 16;

export const PASSPHRASE_ENCODING = "utf-8";

export const PASSPHRASE_IMPORTKEY_ALGORITHM = "PBKDF2";
export const PASSPHRASE_DERIVEKEY_ALGORITHM = "PBKDF2";
export const PASSPHRASE_DERIVEKEY_ITERATIONS = 100000;
export const PASSPHRASE_DERIVEKEY_HASH_ALGORITHM = "SHA-256";
export const PASSPHRASE_DERIVEKEY_GENERATED_KEYLENGTH = 256;

export const ENCRYPTION_ALGORITHM = "AES-GCM";
export const ENCRYPTION_TAGLENGTH_IN_BITS = 128;

export const convertSmallBufferToString = (buffer: ArrayBuffer) => {
  // @ts-ignore
  return window.btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
};

export const convertSmallUint8ArrayToString = (array: Uint8Array) => {
  // @ts-ignore
  return window.btoa(String.fromCharCode.apply(null, array));
};

export const convertSmallStringToBuffer = (packed: string) => {
  const string = window.atob(packed);
  const buffer = new ArrayBuffer(string.length);
  const bufferView = new Uint8Array(buffer);

  for (let i = 0; i < string.length; i++) {
    bufferView[i] = string.charCodeAt(i);
  }

  return buffer;
};

export const makeRandomIv = async () => {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  return { iv };
};

export const makeRandomSalt = async () => {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return { salt };
};

const createEncryptionKeyFromPassword = async (encryptionPassword: string, salt: Uint8Array) => {
  if (!encryptionPassword) {
    throw new Error("encryptionPassword is required");
  }

  if (!salt) {
    throw new Error("salt is required");
  }

  const encodedPassphrase = new TextEncoder().encode(encryptionPassword);

  const keyMaterial = await window.crypto.subtle.importKey("raw", encodedPassphrase, PASSPHRASE_IMPORTKEY_ALGORITHM, false, ["deriveBits", "deriveKey"]);

  const key = await window.crypto.subtle.deriveKey(
    {
      name: PASSPHRASE_DERIVEKEY_ALGORITHM,
      salt: salt as BufferSource,
      iterations: PASSPHRASE_DERIVEKEY_ITERATIONS,
      hash: PASSPHRASE_DERIVEKEY_HASH_ALGORITHM,
    },
    keyMaterial,
    {
      name: ENCRYPTION_ALGORITHM,
      length: PASSPHRASE_DERIVEKEY_GENERATED_KEYLENGTH,
    },
    true,
    ["encrypt", "decrypt"]
  );

  return { key, salt };
};

// For encrypting small (<10mb) amount of data
export const encryptText = async (text: string, encryptionPassword: string) => {
  // encode
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(text);

  // get salt and key
  const { salt } = await makeRandomSalt();
  const { key } = await createEncryptionKeyFromPassword(encryptionPassword, salt);

  // generate random iv
  const { iv } = await makeRandomIv();

  const cipher = await window.crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
      tagLength: ENCRYPTION_TAGLENGTH_IN_BITS,
    },
    key,
    encodedData
  );

  // pack
  return {
    cipher: convertSmallBufferToString(cipher),
    iv: convertSmallUint8ArrayToString(iv),
    salt: convertSmallUint8ArrayToString(salt),
  };
};

// For decrypting small (<10mb) amount of data
export const decryptText = async ({ cipher, iv, salt }: any, encryptionPassword: string) => {
  // unpack
  cipher = convertSmallStringToBuffer(cipher);
  iv = convertSmallStringToBuffer(iv);
  salt = convertSmallStringToBuffer(salt);

  // get  key
  const { key } = await createEncryptionKeyFromPassword(encryptionPassword, salt);

  const encodedData = await window.crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
      tagLength: ENCRYPTION_TAGLENGTH_IN_BITS,
    },
    key,
    cipher
  );

  // decode
  const data = new TextDecoder().decode(encodedData);

  return data;
};
