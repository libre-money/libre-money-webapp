import { isValidNumber, isPositiveNumber, isNonNegativeNumber, isInteger } from "./number-utils";

/** @deprecated Use isValidNumber() instead */
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
  domain: [(val: string) => (val && val.length > 0) || "Please type your domain"],
  password: [(val: string) => (val && val.length > 0) || "Please type your password"],
  currencySign: [(val: string) => (val && val.length > 0 && val.length < 4) || "Sign must be within 1 to 3 characters"],
  required: [(val: any) => (val !== null && val !== undefined && val !== "") || "This field is required"],
  balance: [
    (val: string) => {
      return isValidNumber(val) || "A valid number is required";
    },
  ],
  balanceOptional: [
    (val: string) => {
      if (!val) return true;
      return isValidNumber(val) || "A valid number is required";
    },
  ],
  nonZeroInteger: [
    (val: string) => {
      if (!isValidNumber(val)) {
        return "A valid number is required";
      }
      if (!isPositiveNumber(val)) {
        return "Value must be greater than zero";
      }
      if (!isInteger(val)) {
        return "The number must be a whole number";
      }
      return true;
    },
  ],
  positiveNumber: [
    (val: string) => {
      if (!isValidNumber(val)) {
        return "A valid number is required";
      }
      if (!isPositiveNumber(val)) {
        return "Value must be greater than zero";
      }
      return true;
    },
  ],
  nonNegativeNumber: [
    (val: string) => {
      if (!isValidNumber(val)) {
        return "A valid number is required";
      }
      if (!isNonNegativeNumber(val)) {
        return "Value must be zero or greater";
      }
      return true;
    },
  ],
  notes: [(val: string) => !val || (val && val.length < 1000) || "Note must be less than 1000 characters"],
  document: [(val: string) => !val || (val && val.length < 10000) || "Document must be less than 10000 characters"],
  url: [
    (val: string) => {
      if (!val || val.length === 0) return "Please enter a URL";
      try {
        new URL(val);
        return true;
      } catch {
        return "Please enter a valid URL (e.g., https://example.com)";
      }
    },
  ],
  email: [
    (val: string) => {
      if (!val || val.length === 0) return "Please enter your email address";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) || "Please enter a valid email address";
    },
  ],
};
