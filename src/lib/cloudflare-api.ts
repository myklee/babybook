// Clean Cloudflare API Client - Built specifically for our baby tracker
const API_BASE = 'https://baby-tracker-api.babybook.workers.dev';

interface User {
  id: string;
  email: string;
}

interface Baby {
  id: string;
  name: string;
  birthdate: string;
  user_id: string;
  created_at: string;
}

interface Feeding {
  id: string;
  baby_id: string;
  user_id: string;
  type: 'breast' | 'formula' | 'solid';
  amount?: number;
  notes?: string;
  timestamp: string;
  created_at: string;
}

interface DiaperChange {
  id: string;
  baby_id: string;
  user_id: string;
  type: 'pee' | 'poop' | 'both';
  notes?: string;
  timestamp: string;
  created_at: string;
}

interface SleepSession {
  id: string;
  baby_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  created_at: string;
}

class CloudflareAPI {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.loadAuth();
  }

  private loadAuth() {
    const stored = localStorage.getItem('baby-tracker-auth');
    if (stored) {
      try {
        const auth = JSON.parse(stored);
        this.token = auth.token;
        this.user = auth.user;
      } catch (e) {
        console.warn('Failed to load auth:', e);
      }
    }
  }

  private saveAuth(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem('baby-tracker-auth', JSON.stringify({ token, user }));
  }

  private clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('baby-tracker-auth');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} ${error}`);
    }

    return response.json();
  }

  // Auth methods
  async register(email: string, password: string): Promise<User> {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.saveAuth(data.access_token, data.user);
    return data.user;
  }

  async login(email: string, password: string): Promise<User> {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.saveAuth(data.access_token, data.user);
    return data.user;
  }

  async logout(): Promise<void> {
    this.clearAuth();
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

  async updateBaby(id: string, updates: Partial<Baby>): Promise<Baby> {
    return this.request(`/api/babies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteBaby(id: string): Promise<void> {
    await this.request(`/api/babies/${id}`, {
      method: 'DELETE'
    });
  }

  // Feeding methods
  async getFeedings(babyId?: string): Promise<Feeding[]> {
    const endpoint = babyId ? `/api/feedings?baby_id=${babyId}` : '/api/feedings';
    return this.request(endpoint);
  }

  async createFeeding(feeding: Omit<Feeding, 'id' | 'user_id' | 'created_at'>): Promise<Feeding> {
    return this.request('/api/feedings', {
      method: 'POST',
      body: JSON.stringify(feeding)
    });
  }

  async updateFeeding(id: string, updates: Partial<Feeding>): Promise<Feeding> {
    return this.request(`/api/feedings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteFeeding(id: string): Promise<void> {
    await this.request(`/api/feedings/${id}`, {
      method: 'DELETE'
    });
  }

  // Diaper methods
  async getDiaperChanges(babyId?: string): Promise<DiaperChange[]> {
    const endpoint = babyId ? `/api/diaper_changes?baby_id=${babyId}` : '/api/diaper_changes';
    return this.request(endpoint);
  }

  async createDiaperChange(change: Omit<DiaperChange, 'id' | 'user_id' | 'created_at'>): Promise<DiaperChange> {
    return this.request('/api/diaper_changes', {
      method: 'POST',
      body: JSON.stringify(change)
    });
  }

  async updateDiaperChange(id: string, updates: Partial<DiaperChange>): Promise<DiaperChange> {
    return this.request(`/api/diaper_changes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteDiaperChange(id: string): Promise<void> {
    await this.request(`/api/diaper_changes/${id}`, {
      method: 'DELETE'
    });
  }

  // Sleep methods
  async getSleepSessions(babyId?: string): Promise<SleepSession[]> {
    const endpoint = babyId ? `/api/sleep_sessions?baby_id=${babyId}` : '/api/sleep_sessions';
    return this.request(endpoint);
  }

  async createSleepSession(session: Omit<SleepSession, 'id' | 'user_id' | 'created_at'>): Promise<SleepSession> {
    return this.request('/api/sleep_sessions', {
      method: 'POST',
      body: JSON.stringify(session)
    });
  }

  async updateSleepSession(id: string, updates: Partial<SleepSession>): Promise<SleepSession> {
    return this.request(`/api/sleep_sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteSleepSession(id: string): Promise<void> {
    await this.request(`/api/sleep_sessions/${id}`, {
      method: 'DELETE'
    });
  }
}

// Export singleton instance
export const api = new CloudflareAPI();

// Export types
export type { User, Baby, Feeding, DiaperChange, SleepSession };