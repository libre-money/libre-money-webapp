const lockMap: Record<string, number> = {};

class MutexService {
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
}

/*
Note: According to the current requirements, there will never be a non-trivial
number of locks. Hence, there is no need to implement a cleanup mechanism.
*/

export const mutexService = new MutexService();
