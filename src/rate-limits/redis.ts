export type RedisLike = {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
  hIncrBy(key: string, field: string, increment: number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  hGetAll(key: string): Promise<Record<string, string>>;
  decr(key: string): Promise<unknown>;
  ping(): Promise<unknown>;
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<unknown>;
};
