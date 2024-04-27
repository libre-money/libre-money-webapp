import { sleep } from "src/utils/misc-utils";

const lockMap: Record<string, (a0: boolean) => void> = {};

class DelayedMutexService {
  acquireLock(lockName: string, timeWindowMillis: number): Promise<boolean> {
    const promise = new Promise<boolean>((accept) => {
      if (!Object.hasOwn(lockMap, lockName)) {
        lockMap[lockName] = accept;
        sleep(timeWindowMillis).then(() => {
          lockMap[lockName](true);
          delete lockMap[lockName];
        });
      } else {
        lockMap[lockName](false);
        lockMap[lockName] = accept;
      }
    });
    return promise;
  }
}

export const delayedMutexService = new DelayedMutexService();
