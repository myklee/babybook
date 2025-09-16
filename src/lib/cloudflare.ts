import type { Database } from "./supabase";

// Cloudflare API client that matches Supabase interface patterns
class CloudflareClient {
  private baseUrl: string;
  private token: string | null = null;
  private user: any = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadStoredAuth();
  }

  private loadStoredAuth() {
    const stored = localStorage.getItem('babybook-auth');
    if (stored) {
      try {
        const auth = JSON.parse(stored);
        this.token = auth.access_token;
        this.user = auth.user;
      } catch (e) {
        console.warn('Failed to load stored auth:', e);
      }
    }
  }

  private saveAuth(token: string, user: any) {
    this.token = token;
    this.user = user;
    localStorage.setItem('babybook-auth', JSON.stringify({
      access_token: token,
      user
    }));
  }

  private clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('babybook-auth');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} ${error}`);
    }

    return response.json();
  }

  // Auth methods (matching Supabase patterns)
  auth = {
    signUp: async ({ email, password }: { email: string; password: string }) => {
      const result = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!result.ok) {
        const error = await result.json();
        return { data: null, error };
      }

      const data = await result.json();
      this.saveAuth(data.access_token, data.user);
      return { data: { user: data.user }, error: null };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const result = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!result.ok) {
        const error = await result.json();
        return { data: null, error };
      }

      const data = await result.json();
      this.saveAuth(data.access_token, data.user);
      return { data: { user: data.user }, error: null };
    },

    signOut: async () => {
      this.clearAuth();
      return { error: null };
    },

    getUser: async () => {
      if (!this.token) {
        return { data: { user: null }, error: null };
      }

      try {
        const data = await this.request('/auth/user');
        return { data: { user: data.user }, error: null };
      } catch (error) {
        this.clearAuth();
        return { data: { user: null }, error };
      }
    },

    getSession: async () => {
      if (!this.token || !this.user) {
        return { data: { session: null }, error: null };
      }

      return { 
        data: { 
          session: { 
            user: this.user,
            access_token: this.token 
          } 
        }, 
        error: null 
      };
    },

    refreshSession: async () => {
      // For now, just return current session
      return await this.auth.getSession();
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Simple implementation - call immediately with current state
      if (this.user) {
        callback('SIGNED_IN', { user: this.user });
      } else {
        callback('SIGNED_OUT', null);
      }

      // Return unsubscribe function
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    }
  };

  // Storage methods (placeholder for now - will skip file uploads in Cloudflare mode)
  storage = {
    from: (_bucket: string) => ({
      upload: async (_path: string, _file: File, _options?: any) => {
        console.warn('File upload not implemented in Cloudflare mode yet');
        return { data: null, error: { message: 'File upload not implemented' } };
      },
      remove: async (_paths: string[]) => {
        console.warn('File removal not implemented in Cloudflare mode yet');
        return { data: null, error: null };
      },
      getPublicUrl: (_path: string) => {
        return { data: { publicUrl: '' } };
      }
    })
  };

  // Database query builder (matching Supabase patterns)
  from(table: string) {
    return new CloudflareQueryBuilder(this, table);
  }
}

class CloudflareQueryBuilder {
  private client: CloudflareClient;
  private table: string;
  private selectFields = '*';
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByField: string | null = null;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private limitCount: number | null = null;
  private isDeleteQuery = false;
  private isUpdateQuery = false;
  private updateValues: any = null;

  constructor(client: CloudflareClient, table: string) {
    this.client = client;
    this.table = table;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any) {
    this.whereConditions.push({ field, operator: 'eq', value });
    return this;
  }

  in(field: string, values: any[]) {
    this.whereConditions.push({ field, operator: 'in', value: values });
    return this;
  }

  order(field: string, options: { ascending?: boolean } = {}) {
    this.orderByField = field;
    this.orderDirection = options.ascending === false ? 'desc' : 'asc';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private buildQueryParams() {
    const params = new URLSearchParams();
    
    if (this.selectFields !== '*') {
      params.set('select', this.selectFields);
    }

    this.whereConditions.forEach((condition, index) => {
      params.set(`where_${index}`, `${condition.field}:${condition.operator}:${JSON.stringify(condition.value)}`);
    });

    if (this.orderByField) {
      params.set('order', `${this.orderByField}:${this.orderDirection}`);
    }

    if (this.limitCount) {
      params.set('limit', this.limitCount.toString());
    }

    return params.toString();
  }

  async execute() {
    if (this.isDeleteQuery) {
      return this.executeDelete();
    }
    
    if (this.isUpdateQuery) {
      return this.executeUpdate();
    }

    const queryParams = this.buildQueryParams();
    const endpoint = `/api/${this.table}${queryParams ? `?${queryParams}` : ''}`;
    
    try {
      const data = await (this.client as any).request(endpoint);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  private async executeDelete() {
    if (this.whereConditions.length === 0) {
      throw new Error('Delete requires where conditions');
    }

    const id = this.whereConditions.find(c => c.field === 'id')?.value;
    if (id) {
      // Delete by ID
      try {
        await (this.client as any).request(`/api/${this.table}/${id}`, {
          method: 'DELETE'
        });
        return { data: null, error: null };
      } catch (error) {
        return { data: null, error };
      }
    } else {
      // Delete by other conditions (bulk delete)
      const queryParams = this.buildQueryParams();
      try {
        await (this.client as any).request(`/api/${this.table}/bulk-delete?${queryParams}`, {
          method: 'DELETE'
        });
        return { data: null, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  }

  private async executeUpdate() {
    if (this.whereConditions.length === 0) {
      throw new Error('Update requires where conditions');
    }

    const id = this.whereConditions.find(c => c.field === 'id')?.value;
    if (!id) {
      throw new Error('Update requires id in where conditions');
    }

    try {
      const data = await (this.client as any).request(`/api/${this.table}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(this.updateValues)
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Alias for execute to match Supabase patterns
  async then(resolve: (result: any) => void, reject?: (error: any) => void) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (error) {
      if (reject) reject(error);
    }
  }

  insert(values: any) {
    return new CloudflareInsertBuilder(this.client, this.table, values);
  }

  update(values: any) {
    this.isUpdateQuery = true;
    this.updateValues = values;
    return this;
  }

  delete() {
    this.isDeleteQuery = true;
    return this;
  }
}

class CloudflareInsertBuilder {
  private client: CloudflareClient;
  private table: string;
  private values: any;

  constructor(client: CloudflareClient, table: string, values: any) {
    this.client = client;
    this.table = table;
    this.values = values;
  }

  select(_fields = '*') {
    // For insert operations, we'll return the inserted data
    return this;
  }

  async then(resolve: (result: any) => void, reject?: (error: any) => void) {
    try {
      const data = await (this.client as any).request(`/api/${this.table}`, {
        method: 'POST',
        body: JSON.stringify(this.values)
      });
      resolve({ data, error: null });
    } catch (error) {
      if (reject) reject({ data: null, error });
      else resolve({ data: null, error });
    }
  }
}

// Create and export the client
const cloudflareUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://baby-tracker-api.babybook.workers.dev';

export const cloudflare = new CloudflareClient(cloudflareUrl);

// Export the same Database types for compatibility
export type { Database };