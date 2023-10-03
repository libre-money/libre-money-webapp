import { date } from "quasar";

export async function sleep(duration: number) {
  return new Promise((accept) => {
    setTimeout(accept, duration);
  });
}

export function deepClone(object: any) {
  return JSON.parse(JSON.stringify(object));
}

export function asAmount(amount: number | string | null | undefined) {
  return parseFloat(String(amount)) || 0;
}

function hexToRgb(hex: any) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function guessFontColorCode(colorCode: string) {
  try {
    colorCode = colorCode.replace("#", "");
    const color = hexToRgb(colorCode)!;
    const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
    if (luminance > 0.5) {
      return "#000000";
    } else {
      return "#ffffff";
    }
  } catch (ex) {
    return "#ffffff";
  }
}

export function prettifyDate(timestamp: number) {
  return date.formatDate(timestamp, "YYYY-MM-DD hh:mm:ss a");
}
