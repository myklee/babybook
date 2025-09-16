// API client configuration - switch between Supabase and Cloudflare
import { supabase } from './supabase';
import { cloudflare } from './cloudflare';
import type { Database } from './supabase';

// Configuration flag - set to true to use Cloudflare
const USE_CLOUDFLARE = import.meta.env.VITE_USE_CLOUDFLARE === 'true';

// Export the appropriate client
export const apiClient = USE_CLOUDFLARE ? cloudflare : supabase;

// Export types for compatibility
export type { Database };

// Helper to check which client is being used
export const isUsingCloudflare = () => USE_CLOUDFLARE;
export const isUsingSupabase = () => !USE_CLOUDFLARE;

console.log(`🚀 API Client: ${USE_CLOUDFLARE ? 'Cloudflare' : 'Supabase'}`);