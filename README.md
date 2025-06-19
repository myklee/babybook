# BabyBook

A Vue 3 baby tracking app for monitoring feedings and diaper changes with Supabase backend.

## Features

- **User Authentication**: Sign up/sign in with email and password
- **Baby Management**: Add and manage multiple babies
- **Feeding Tracking**: Record breast milk, formula, and solid food feedings
- **Diaper Changes**: Track wet, dirty, and both types of diaper changes
- **Real-time Data**: All data is stored in Supabase and syncs across devices
- **Edit & Delete**: Modify or remove any recorded activities
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **State Management**: Pinia
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: CSS with modern design

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd babybook
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project settings and copy the following values:
   - Project URL
   - Anon/Public key

3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set up the Database

1. In your Supabase dashboard, go to the SQL Editor
2. Run the SQL from `supabase/migrations/001_initial_schema.sql`
3. This will create the necessary tables and security policies

### 5. Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Optionally, configure email templates for better user experience

### 6. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

1. **Sign Up/In**: Create an account or sign in with existing credentials
2. **Add Babies**: Add your babies with their names
3. **Select a Baby**: Choose which baby you want to track activities for
4. **Record Activities**:
   - **Feedings**: Click "Breast" or "Formula" buttons for quick recording
   - **Diaper Changes**: Click "Pee" or "Poop" buttons for quick recording
5. **Edit/Delete**: Click the edit button (✏️) on any activity to modify or delete it
6. **View History**: See recent feedings and diaper changes for the selected baby

## Database Schema

### Babies Table
- `id`: Unique identifier (UUID)
- `name`: Baby's name
- `user_id`: Reference to authenticated user
- `created_at`: Timestamp when baby was added

### Feedings Table
- `id`: Unique identifier (UUID)
- `baby_id`: Reference to baby
- `timestamp`: When the feeding occurred
- `amount`: Amount in milliliters
- `type`: Type of feeding ('breast', 'formula', 'solid')
- `notes`: Optional notes
- `user_id`: Reference to authenticated user
- `created_at`: Timestamp when record was created

### Diaper Changes Table
- `id`: Unique identifier (UUID)
- `baby_id`: Reference to baby
- `timestamp`: When the diaper change occurred
- `type`: Type of change ('wet', 'dirty', 'both')
- `notes`: Optional notes
- `user_id`: Reference to authenticated user
- `created_at`: Timestamp when record was created

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- All database operations require authentication
- Passwords are securely hashed by Supabase Auth

## Deployment

### GitHub Pages

1. Push your code to GitHub
2. Set up GitHub Actions for automatic deployment
3. Configure the base URL in `vite.config.ts` for your repository

### Other Platforms

The app can be deployed to any static hosting platform:
- Vercel
- Netlify
- Firebase Hosting
- AWS S3 + CloudFront

Remember to:
- Set environment variables in your hosting platform
- Configure CORS settings in Supabase if needed
- Update the site URL in Supabase Auth settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
