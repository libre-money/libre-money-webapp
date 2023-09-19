export async function sleep(duration: number) {
  return new Promise((accept) => {
    setTimeout(accept, duration);
  });
}

export function deepClone(object: any) {
  return JSON.parse(JSON.stringify(object));
}

export function asAmount(amount: number | string) {
  return parseFloat(String(amount)) || 0;
}
