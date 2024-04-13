function mapList<T, U>(inputList: Array<T>, concurrentLimit: number, processorFn: (a0: T) => Promise<U>): Promise<Array<U>> {
  return new Promise(async (accept, reject) => {
    if (inputList.length === 0) {
      accept([]);
      return;
    }

    const outputList: Array<U> = [];

    let finalPromiseResolved = false;

    let cursor = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    function process(input: T) {
      if (finalPromiseResolved) return;

      const localCursor = cursor;
      // console.debug("PromisePool -> Entry", { localCursor, inProgressCount });

      inProgressCount += 1;
      processorFn(input)
        .then((res) => {
          outputList[localCursor] = res;

          if (finalPromiseResolved) return;
          completedCount += 1;
          inProgressCount -= 1;

          // console.debug("PromisePool -> Single Completion", { localCursor, completedCount, inProgressCount });

          if (completedCount === inputList.length) {
            // console.debug("PromisePool -> Final Completion", outputList);

            if (!finalPromiseResolved) {
              finalPromiseResolved = true;
              accept(outputList);
            }
            return;
          }

          if (inProgressCount < concurrentLimit && cursor < inputList.length) {
            process(inputList[cursor]);
            cursor += 1;
          }
        })
        .catch((ex) => {
          // console.debug("PromisePool -> Rejection", ex);

          if (!finalPromiseResolved) {
            finalPromiseResolved = true;
            reject(ex);
          }
        });
    }

    for (let i = 0; i < Math.min(concurrentLimit, inputList.length); i++) {
      process(inputList[i]);
      cursor += 1;
    }

    return outputList;
  });
}

export default { mapList };
