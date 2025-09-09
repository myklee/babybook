# Cloudflare Migration - Design Document

## Overview

This migration moves the baby tracking app from Supabase's integrated platform to Cloudflare's distributed services ecosystem. The new architecture leverages Cloudflare D1 (SQLite), R2 (Object Storage), Workers (Serverless Functions), and other Cloudflare services for a more cost-effective and globally distributed solution.

## Architecture

### Current Supabase Stack

- **Database:** PostgreSQL with Row Level Security
- **Authentication:** Supabase Auth (email/password + JWT)
- **File Storage:** Supabase Storage buckets
- **Real-time:** Supabase Realtime subscriptions
- **API:** Auto-generated REST API + PostgREST

### New Cloudflare Stack

- **Database:** Cloudflare D1 (SQLite at the edge)
- **Authentication:** Cloudflare Access + Workers Auth
- **File Storage:** Cloudflare R2 (S3-compatible object storage)
- **Real-time:** WebSockets via Cloudflare Workers
- **API:** Custom REST API via Cloudflare Workers
- **CDN:** Cloudflare CDN for static assets and images

## Data Migration Strategy

### Database Schema Translation

**PostgreSQL → SQLite (D1) Mapping:**

```sql
-- Supabase PostgreSQL tables become D1 SQLite tables
-- UUID primary keys → TEXT primary keys (SQLite doesn't have native UUID)
-- TIMESTAMPTZ → TEXT (ISO 8601 format)
-- JSONB → TEXT (JSON strings)
-- Row Level Security → Application-level security in Workers
```

### Authentication Migration

**Supabase Auth → Cloudflare Workers Auth:**

- Migrate user accounts and password hashes
- Implement JWT token generation in Workers
- Create session management system
- Maintain existing auth flow patterns

### File Storage Migration

**Supabase Storage → Cloudflare R2:**

- Copy all baby images from Supabase buckets to R2
- Update image URLs to use R2 endpoints
- Implement signed URL generation for secure access
- Set up CDN caching for optimal performance

## Components and Interfaces

### New Cloudflare Workers

**api-worker.js:**

- Main API endpoint handler
- Database operations via D1 bindings
- Authentication middleware
- CORS handling for web app

**auth-worker.js:**

- User registration and login
- JWT token generation and validation
- Password hashing and verification
- Session management

**upload-worker.js:**

- File upload handling to R2
- Image processing and optimization
- Signed URL generation
- Metadata management

### Updated Frontend Components

**lib/cloudflare.ts:**

- Replace Supabase client with Cloudflare API client
- Maintain same interface patterns for minimal code changes
- Handle authentication tokens
- Manage API endpoints

**stores/babyStore.ts:**

- Update API calls to use new Cloudflare endpoints
- Maintain existing reactive patterns
- Handle new authentication flow
- Preserve all existing functionality

## Database Schema Design

### D1 SQLite Schema

```sql
-- Users table (replaces Supabase auth.users)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Babies table (same structure, different types)
CREATE TABLE babies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birthdate TEXT,
  image_url TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Feedings table (preserve all functionality)
CREATE TABLE feedings (
  id TEXT PRIMARY KEY,
  baby_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('breast', 'formula', 'solid', 'nursing')),
  amount REAL,
  notes TEXT,
  start_time TEXT,
  end_time TEXT,
  breast_used TEXT CHECK (breast_used IN ('left', 'right', 'both')),
  left_duration INTEGER DEFAULT 0,
  right_duration INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (baby_id) REFERENCES babies(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Additional tables follow same pattern...
```

### R2 Bucket Structure

```
baby-images/
├── {user_id}/
│   ├── {baby_id}/
│   │   ├── profile.jpg
│   │   ├── profile_thumb.jpg
│   │   └── {timestamp}_photo.jpg
```

## API Design

### RESTful Endpoints (Workers)

**Authentication:**

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user

**Babies:**

- `GET /api/babies` - List user's babies
- `POST /api/babies` - Create new baby
- `PUT /api/babies/{id}` - Update baby
- `DELETE /api/babies/{id}` - Delete baby

**Feedings:**

- `GET /api/babies/{id}/feedings` - Get feeding history
- `POST /api/babies/{id}/feedings` - Add feeding record
- `PUT /api/feedings/{id}` - Update feeding
- `DELETE /api/feedings/{id}` - Delete feeding

**File Upload:**

- `POST /api/upload/baby-image` - Upload baby image
- `GET /api/images/{path}` - Get signed URL for image

## Security Model

### Authentication & Authorization

- JWT tokens generated by Workers
- Token validation middleware on all protected routes
- User ID extraction from validated tokens
- Application-level row security (replace RLS)

### Data Protection

- HTTPS everywhere via Cloudflare SSL
- Signed URLs for R2 object access
- Input validation and sanitization
- Rate limiting via Cloudflare Workers

## Performance Optimizations

### Edge Computing Benefits

- D1 database replicated globally
- Workers run at edge locations
- R2 objects cached via CDN
- Reduced latency for global users

### Caching Strategy

- Static assets cached at edge
- API responses cached where appropriate
- Image thumbnails generated and cached
- Database query optimization

## Migration Process

### Phase 1: Infrastructure Setup

1. Create Cloudflare D1 database
2. Set up R2 buckets
3. Deploy initial Workers
4. Configure DNS and SSL

### Phase 2: Data Migration

1. Export all data from Supabase
2. Transform data for D1 schema
3. Import data to D1 database
4. Copy files to R2 storage
5. Validate data integrity

### Phase 3: Application Updates

1. Update frontend API client
2. Test all functionality
3. Deploy updated application
4. Monitor for issues

### Phase 4: Cutover

1. Update DNS to point to Cloudflare
2. Monitor performance and errors
3. Decommission Supabase resources
4. Celebrate cost savings! 🎉

## Cost Analysis

### Current Supabase Costs (Estimated)

- Database: $25/month (Pro plan)
- Storage: $0.021/GB/month
- Bandwidth: $0.09/GB
- **Total: ~$30-50/month**

### New Cloudflare Costs (Estimated)

- D1: $0.50/million reads, $2.50/million writes
- R2: $0.015/GB/month storage, $0.01/GB egress
- Workers: $0.50/million requests
- **Total: ~$5-15/month** (60-70% cost reduction)

## Risk Mitigation

### Data Backup Strategy

- Automated D1 backups
- R2 object versioning
- Export scripts for data portability
- Rollback procedures documented

### Monitoring & Alerting

- Cloudflare Analytics dashboard
- Custom metrics via Workers
- Error tracking and logging
- Performance monitoring

### Rollback Plan

- Keep Supabase instance running during transition
- DNS-based traffic switching
- Data synchronization scripts
- Quick rollback procedures
