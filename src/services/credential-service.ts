import { decryptText, encryptText } from "src/utils/crypto-utils";

const LOCAL_OR_TAB_STORAGE_KEY = "--lm-credentials";

const ON_REST_ENCRYPTION_PASSPHRASE = "4f5way7j9o05a34f0y97ja34f5";

const inMemoryCredentials: {
  username: string;
  password: string;
} = {
  username: "",
  password: "",
};

(async () => {
  const item = sessionStorage.getItem(LOCAL_OR_TAB_STORAGE_KEY) || localStorage.getItem(LOCAL_OR_TAB_STORAGE_KEY);
  if (!item) return;
  try {
    const { username, cipherWithProps } = JSON.parse(item);
    const password = await decryptText(cipherWithProps as any, ON_REST_ENCRYPTION_PASSPHRASE);

    inMemoryCredentials.username = username;
    inMemoryCredentials.password = password;
  } catch (ex) {
    console.error(ex);
    ("pass");
  }
})();

export const credentialService = {
  async storeCredentials(username: string, password: string, shouldRememberPassword: boolean) {
    inMemoryCredentials.username = username;
    inMemoryCredentials.password = password;

    const cipherWithProps = await encryptText(inMemoryCredentials.password, ON_REST_ENCRYPTION_PASSPHRASE);
    const storableCredentials = {
      username,
      cipherWithProps,
    };

    if (shouldRememberPassword) {
      localStorage.setItem(LOCAL_OR_TAB_STORAGE_KEY, JSON.stringify(storableCredentials));
    } else {
      sessionStorage.setItem(LOCAL_OR_TAB_STORAGE_KEY, JSON.stringify(storableCredentials));
    }
  },

  hasCredentials() {
    return inMemoryCredentials.username.length > 0 && inMemoryCredentials.password.length > 0;
  },

  getCredentials() {
    return inMemoryCredentials;
  },

  async clearCredentials() {
    inMemoryCredentials.username = "";
    inMemoryCredentials.password = "";
    sessionStorage.removeItem(LOCAL_OR_TAB_STORAGE_KEY);
    localStorage.removeItem(LOCAL_OR_TAB_STORAGE_KEY);
  },

  async injectCredentials(url: string) {
    if (!this.hasCredentials()) {
      throw new Error("No credentials to inject");
    }
    const str = url.replace("https://", "");
    return `https://${encodeURIComponent(inMemoryCredentials.username)}:${encodeURIComponent(inMemoryCredentials.password)}@${str}`;
  },
};
