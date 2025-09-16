// Custom OAuth Implementation for Cloudflare Workers
// Ultra-cheap Google & Apple Sign-In

// 1. OAuth Configuration
const OAUTH_CONFIGS = {
  google: {
    clientId: "your-google-client-id.apps.googleusercontent.com",
    clientSecret: "your-google-client-secret",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scope: "openid email profile",
  },
  apple: {
    clientId: "your.app.bundle.id",
    teamId: "YOUR_TEAM_ID",
    keyId: "YOUR_KEY_ID",
    privateKey: "YOUR_PRIVATE_KEY",
    authUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    scope: "name email",
  },
};

// 2. Google OAuth Flow
export async function handleGoogleAuth(request, env, corsHeaders) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    // Step 1: Redirect to Google
    const authUrl = new URL(OAUTH_CONFIGS.google.authUrl);
    authUrl.searchParams.set("client_id", OAUTH_CONFIGS.google.clientId);
    authUrl.searchParams.set(
      "redirect_uri",
      `${url.origin}/auth/google/callback`
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", OAUTH_CONFIGS.google.scope);
    authUrl.searchParams.set("state", crypto.randomUUID());

    return Response.redirect(authUrl.toString(), 302);
  }

  // Step 2: Exchange code for token
  try {
    const tokenResponse = await fetch(OAUTH_CONFIGS.google.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: OAUTH_CONFIGS.google.clientId,
        client_secret: OAUTH_CONFIGS.google.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${url.origin}/auth/google/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error("Failed to get access token");
    }

    // Step 3: Get user info
    const userResponse = await fetch(OAUTH_CONFIGS.google.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userResponse.json();

    // Step 4: Create or get user in your database
    let user = await env.DB.prepare(
      "SELECT id, email FROM users WHERE email = ?"
    )
      .bind(googleUser.email)
      .first();

    if (!user) {
      // Create new user
      const userId = crypto.randomUUID();
      await env.DB.prepare(
        `
        INSERT INTO users (id, email, password_hash, salt, created_at) 
        VALUES (?, ?, ?, ?, ?)
      `
      )
        .bind(
          userId,
          googleUser.email,
          "oauth_user", // Special marker for OAuth users
          "oauth",
          new Date().toISOString()
        )
        .run();

      user = { id: userId, email: googleUser.email };
    }

    // Step 5: Generate your JWT
    const payload = {
      sub: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };

    const jwt = await generateJWT(payload, env.JWT_SECRET);

    // Step 6: Redirect to your app with token
    const redirectUrl = new URL(`${url.origin}/auth/success`);
    redirectUrl.searchParams.set("token", jwt);
    redirectUrl.searchParams.set("user", btoa(JSON.stringify(user)));

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    return new Response(JSON.stringify({ error: "OAuth failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// 3. Apple OAuth Flow (more complex due to JWT requirements)
export async function handleAppleAuth(request, env, corsHeaders) {
  // Apple requires JWT client assertion
  const clientAssertion = await generateAppleClientAssertion(env);

  // Similar flow to Google but with Apple-specific requirements
  // Implementation would be similar but with Apple's specific JWT requirements
}

// 4. Frontend Integration
export function generateOAuthButtons() {
  return `
    <!-- Google Sign-In Button -->
    <button onclick="loginWithGoogle()" class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
      <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>

    <!-- Apple Sign-In Button -->
    <button onclick="loginWithApple()" class="w-full flex items-center justify-center px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 mt-2">
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      Continue with Apple
    </button>

    <script>
      function loginWithGoogle() {
        window.location.href = '/auth/google';
      }
      
      function loginWithApple() {
        window.location.href = '/auth/apple';
      }
    </script>
  `;
}

// 5. Setup Instructions
export const OAUTH_SETUP_INSTRUCTIONS = {
  google: {
    steps: [
      "1. Go to Google Cloud Console (console.cloud.google.com)",
      "2. Create a new project or select existing",
      "3. Enable Google+ API",
      "4. Create OAuth 2.0 credentials",
      "5. Add your domain to authorized origins",
      "6. Add callback URL: https://your-worker.dev/auth/google/callback",
      "7. Copy Client ID and Client Secret to your Worker",
    ],
    cost: "$0/month (free tier: 100,000 requests)",
  },
  apple: {
    steps: [
      "1. Go to Apple Developer Console",
      "2. Create App ID and Service ID",
      "3. Generate private key for Sign in with Apple",
      "4. Configure return URLs",
      "5. Add domain verification",
      "6. Copy credentials to your Worker",
    ],
    cost: "$99/year Apple Developer Program (if you don't have it)",
  },
};

// 6. Cost Comparison
export const OAUTH_COST_COMPARISON = {
  "Custom OAuth (Cloudflare)": "$0/month",
  "Cloudflare Access": "$3/user/month",
  Auth0: "$23/month",
  "Firebase Auth": "$0.0055/user (after free tier)",
  "Supabase Auth": "$25/month",
};
