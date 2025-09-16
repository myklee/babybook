// Secure Authentication Implementation for Cloudflare Workers

// 1. Password Hashing with Web Crypto API
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// 2. JWT Token Generation
async function generateJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));

  const data = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${data}.${encodedSignature}`;
}

// 3. Secure Registration
async function secureRegister(email, password, env) {
  // Check if user exists
  const existingUser = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Generate salt and hash password
  const salt = await generateSalt();
  const passwordHash = await hashPassword(password, salt);

  // Store user
  const userId = crypto.randomUUID();
  await env.DB.prepare(
    `
    INSERT INTO users (id, email, password_hash, salt, created_at) 
    VALUES (?, ?, ?, ?, ?)
  `
  )
    .bind(userId, email, passwordHash, salt, new Date().toISOString())
    .run();

  return { id: userId, email };
}

// 4. Secure Login
async function secureLogin(email, password, env) {
  // Get user with salt
  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, salt FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Verify password
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) {
    throw new Error("Invalid credentials");
  }

  // Generate JWT
  const payload = {
    sub: user.id,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  const token = await generateJWT(payload, env.JWT_SECRET);

  return {
    access_token: token,
    user: { id: user.id, email: user.email },
  };
}

// 5. Token Validation
async function validateJWT(token, secret) {
  const [header, payload, signature] = token.split(".");

  // Verify signature
  const data = `${header}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBuffer = Uint8Array.from(atob(signature), (c) =>
    c.charCodeAt(0)
  );
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBuffer,
    encoder.encode(data)
  );

  if (!isValid) {
    throw new Error("Invalid token");
  }

  // Check expiration
  const decodedPayload = JSON.parse(atob(payload));
  if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return decodedPayload;
}

// 6. Rate Limiting (using Durable Objects or KV)
class RateLimiter {
  constructor(env) {
    this.env = env;
  }

  async checkLimit(ip, maxRequests = 5, windowMs = 60000) {
    const key = `rate_limit:${ip}`;
    const now = Date.now();

    // Get current count
    const current = await this.env.KV.get(key);
    const requests = current
      ? JSON.parse(current)
      : { count: 0, resetTime: now + windowMs };

    // Reset if window expired
    if (now > requests.resetTime) {
      requests.count = 0;
      requests.resetTime = now + windowMs;
    }

    // Check limit
    if (requests.count >= maxRequests) {
      throw new Error("Rate limit exceeded");
    }

    // Increment count
    requests.count++;
    await this.env.KV.put(key, JSON.stringify(requests), {
      expirationTtl: Math.ceil(windowMs / 1000),
    });

    return true;
  }
}

export { secureRegister, secureLogin, validateJWT, RateLimiter };
