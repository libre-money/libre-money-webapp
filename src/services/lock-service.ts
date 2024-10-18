import { CodedError } from "src/utils/error-utils";
import { sleep } from "src/utils/misc-utils";

const lockMap: Record<string, number> = {};
const delayedMutexLockMap: Record<string, (a0: boolean) => void> = {};

class LockService {
  acquireLock(lockName: string, autoReleaseAfterMillis: number): boolean {
    if (Object.hasOwn(lockMap, lockName)) {
      if (lockMap[lockName] > Date.now()) {
        return false;
      }
    }

    const autoReleaseEpoch = Date.now() + autoReleaseAfterMillis;
    lockMap[lockName] = autoReleaseEpoch;
    return true;
  }

  releaseLock(lockName: string): void {
    if (Object.hasOwn(lockMap, lockName)) {
      delete lockMap[lockName];
    }
  }

  acquireDalyedMutexLock(lockName: string, timeWindowMillis: number): Promise<boolean> {
    const promise = new Promise<boolean>((accept) => {
      if (!Object.hasOwn(delayedMutexLockMap, lockName)) {
        delayedMutexLockMap[lockName] = accept;
        sleep(timeWindowMillis).then(() => {
          delayedMutexLockMap[lockName](true);
          delete delayedMutexLockMap[lockName];
        });
      } else {
        delayedMutexLockMap[lockName](false);
        delayedMutexLockMap[lockName] = accept;
      }
    });
    return promise;
  }

  async awaitTillTruthy<T>(timeoutMillis: number, fn: () => T): Promise<T> {
    const endTime = Date.now() + timeoutMillis;
    while (true) {
      const result = await fn();
      if (result) {
        return result;
      }
      if (Date.now() > endTime) {
        throw new CodedError("TIMED_OUT", "Timed out while waiting for a condition to be true");
      }
      await sleep(20);
    }
  }
}

/*
Note: According to the current requirements, there will never be a non-trivial
number of locks. Hence, there is no need to implement a cleanup mechanism.
*/

export const lockService = new LockService();
