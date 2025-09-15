// Cloudflare API Client
const API_BASE = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://baby-tracker-api.babybook.workers.dev';

export interface User {
  id: string;
  email: string;
}

export interface Baby {
  id: string;
  name: string;
  birthdate: string;
  user_id: string;
}

export interface Feeding {
  id: string;
  baby_id: string;
  type: 'breast' | 'formula' | 'solid';
  amount?: number;
  topup_amount?: number;
  timestamp: string;
}

export interface DiaperChange {
  id: string;
  baby_id: string;
  type: 'wet' | 'dirty' | 'both';
  timestamp: string;
}

export interface SleepSession {
  id: string;
  baby_id: string;
  start_time: string;
  end_time?: string;
}

export class CloudflareAPI {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.token = localStorage.getItem('baby-tracker-token');
    const userStr = localStorage.getItem('baby-tracker-user');
    this.user = userStr ? JSON.parse(userStr) : null;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    console.log(`Making request to: ${API_BASE}${endpoint}`, { options, headers });

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('API Error:', response.status, error);
        throw new Error(`API Error: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<User> {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.token = data.access_token;
    this.user = data.user;
    localStorage.setItem('baby-tracker-token', this.token);
    localStorage.setItem('baby-tracker-user', JSON.stringify(this.user));
    return this.user;
  }

  async register(email: string, password: string): Promise<User> {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.token = data.access_token;
    this.user = data.user;
    localStorage.setItem('baby-tracker-token', this.token);
    localStorage.setItem('baby-tracker-user', JSON.stringify(this.user));
    return this.user;
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('baby-tracker-token');
    localStorage.removeItem('baby-tracker-user');
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Baby methods
  async getBabies(): Promise<Baby[]> {
    return this.request('/api/babies');
  }

  async createBaby(name: string, birthdate: string): Promise<Baby> {
    return this.request('/api/babies', {
      method: 'POST',
      body: JSON.stringify({ name, birthdate })
    });
  }

  // Feeding methods
  async getFeedings(): Promise<Feeding[]> {
    return this.request('/api/feedings');
  }

  async createFeeding(feeding: Omit<Feeding, 'id'>): Promise<Feeding> {
    console.log('Creating feeding:', feeding);
    try {
      const result = await this.request('/api/feedings', {
        method: 'POST',
        body: JSON.stringify(feeding)
      });
      console.log('Feeding created:', result);
      return result;
    } catch (error) {
      console.error('Failed to create feeding:', error);
      throw error;
    }
  }

  // Diaper methods
  async getDiaperChanges(): Promise<DiaperChange[]> {
    return this.request('/api/diaper_changes');
  }

  async createDiaperChange(diaperChange: Omit<DiaperChange, 'id'>): Promise<DiaperChange> {
    return this.request('/api/diaper_changes', {
      method: 'POST',
      body: JSON.stringify(diaperChange)
    });
  }

  // Sleep methods
  async getSleepSessions(): Promise<SleepSession[]> {
    return this.request('/api/sleep_sessions');
  }

  async createSleepSession(sleepSession: Omit<SleepSession, 'id'>): Promise<SleepSession> {
    return this.request('/api/sleep_sessions', {
      method: 'POST',
      body: JSON.stringify(sleepSession)
    });
  }
}

// Export singleton instance
export const cloudflareAPI = new CloudflareAPI();