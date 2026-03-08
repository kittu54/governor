export interface SupabaseServerClient {
  auth: {
    getSession: () => Promise<{ data: { session: { access_token?: string } | null } }>;
    getUser: () => Promise<{ data: { user: { id: string; app_metadata?: Record<string, unknown> } | null } }>;
  };
}

const unsupportedServerClient: SupabaseServerClient = {
  auth: {
    async getSession() {
      return { data: { session: null } };
    },
    async getUser() {
      return { data: { user: null } };
    },
  },
};

export async function getSupabaseServerClient(): Promise<SupabaseServerClient> {
  return unsupportedServerClient;
}
