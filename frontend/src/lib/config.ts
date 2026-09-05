export interface RuntimeConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

let cached: Promise<RuntimeConfig> | null = null;

export function getConfig(): Promise<RuntimeConfig> {
  cached ??= fetch('/api/config')
    .then((res) => {
      if (!res.ok) throw new Error('Could not load runtime config');
      return res.json() as Promise<RuntimeConfig>;
    })
    .catch((err) => {
      cached = null;
      throw err;
    });
  return cached;
}
