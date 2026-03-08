type RuntimeTarget = "server" | "client";

function readVar(name: string, target: RuntimeTarget): string | undefined {
  if (target === "server") {
    return process.env[name];
  }

  if (typeof window === "undefined") {
    return process.env[name];
  }

  return process.env[name];
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getApiBaseUrl(target: RuntimeTarget): string {
  const explicit = readVar("NEXT_PUBLIC_API_BASE_URL", target) ?? readVar("NEXT_PUBLIC_API_URL", target);

  if (explicit && isHttpUrl(explicit)) {
    return explicit.replace(/\/$/, "");
  }

  if (readVar("NODE_ENV", target) === "production") {
    return "https://api.governor.run";
  }

  return "http://localhost:4000";
}

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function getSupabasePublicConfig(target: RuntimeTarget): SupabasePublicConfig | null {
  const url = readVar("NEXT_PUBLIC_SUPABASE_URL", target) ?? "";
  const anonKey = readVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", target) ?? "";

  if (!url || !anonKey) {
    return null;
  }

  if (!isHttpUrl(url)) {
    return null;
  }

  return { url, anonKey };
}

