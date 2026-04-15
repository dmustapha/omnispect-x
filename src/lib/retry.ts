export async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 500): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
  throw new Error("unreachable");
}
