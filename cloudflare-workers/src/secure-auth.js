// Secure Authentication for Cloudflare Workers
// Ultra-cheap but secure implementation

// 1. Password Hashing with Web Crypto API
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// 2. JWT Token Generation (Simple but secure)
export async function generateJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "");

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
  ).replace(/=/g, "");

  return `${data}.${encodedSignature}`;
}

// 3. JWT Token Validation
export async function validateJWT(token, secret) {
  try {
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

    // Decode signature (add padding if needed)
    const paddedSignature =
      signature + "=".repeat((4 - (signature.length % 4)) % 4);
    const signatureBuffer = Uint8Array.from(atob(paddedSignature), (c) =>
      c.charCodeAt(0)
    );
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      encoder.encode(data)
    );

    if (!isValid) {
      throw new Error("Invalid token signature");
    }

    // Decode payload (add padding if needed)
    const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decodedPayload = JSON.parse(atob(paddedPayload));

    // Check expiration
    if (
      decodedPayload.exp &&
      decodedPayload.exp < Math.floor(Date.now() / 1000)
    ) {
      throw new Error("Token expired");
    }

    return decodedPayload;
  } catch (error) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
}

// 4. Secure Registration
export async function secureRegister(email, password, env) {
  // Validate input
  if (!email || !password) {
    throw new Error("Email and password required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

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

// 5. Secure Login
export async function secureLogin(email, password, env) {
  // Validate input
  if (!email || !password) {
    throw new Error("Email and password required");
  }

  // Get user with salt and hash
  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, salt FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT (24 hour expiry)
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

// 6. Update existing user password (for migration)
export async function updateUserPassword(email, password, env) {
  const salt = await generateSalt();
  const passwordHash = await hashPassword(password, salt);

  await env.DB.prepare(
    `
    UPDATE users 
    SET password_hash = ?, salt = ? 
    WHERE email = ?
  `
  )
    .bind(passwordHash, salt, email)
    .run();

  return true;
}
