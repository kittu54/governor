export interface SupabaseBrowserClient {
  auth: {
    getSession: () => Promise<{ data: { session: { access_token?: string } | null } }>;
    getUser: () => Promise<{ data: { user: { email?: string | null } | null } }>;
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: { message: string } | null }>;
    signUp: (credentials: { email: string; password: string }) => Promise<{ error: { message: string } | null }>;
    signOut: () => Promise<void>;
  };
}

function unsupported(): { message: string } {
  return { message: "Supabase client is unavailable in this deployment. Configure Clerk auth instead." };
}

const unsupportedClient: SupabaseBrowserClient = {
  auth: {
    async getSession() {
      return { data: { session: null } };
    },
    async getUser() {
      return { data: { user: null } };
    },
    async signInWithPassword() {
      return { error: unsupported() };
    },
    async signUp() {
      return { error: unsupported() };
    },
    async signOut() {
      return;
    },
  },
};

export function getSupabaseBrowserClient(): SupabaseBrowserClient {
  return unsupportedClient;
}
