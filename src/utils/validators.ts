export const validators = {
  username: [
    (val: string) => (val && val.length > 0) || "Please type your username",
  ],
  password: [
    (val: string) => (val && val.length > 0) || "Please type your password",
  ],
};
