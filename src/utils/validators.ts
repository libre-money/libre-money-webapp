function isNumeric(str: string) {
  if (typeof str != "string") return false; // we only process strings!
  return (
    // @ts-ignore
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

export const validators = {
  name: [(val: string) => (val && val.length > 0) || "Please type a name"],
  username: [(val: string) => (val && val.length > 0) || "Please type your username"],
  password: [(val: string) => (val && val.length > 0) || "Please type your password"],
  currencySign: [(val: string) => (val && val.length > 0 && val.length < 4) || "Sign must be within 1 to 3 characters"],
  balance: [
    (val: string) => {
      return isNumeric(String(val)) || "A valid number is required";
    },
  ],
  notes: [(val: string) => !val || (val && val.length < 1000) || "Note must be less than 1000 characters"],
  document: [(val: string) => !val || (val && val.length < 10000) || "Document must be less than 10000 characters"],
};
