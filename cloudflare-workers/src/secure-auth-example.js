// SECURE Authentication Example (NOT implemented yet)

// 1. REGISTRATION - Store hashed password
async function secureRegister(email, password, env) {
  // Hash the password with salt
  const passwordHash = await hashPassword(password);

  // Store in database
  await env.DB.prepare(
    `
    INSERT INTO users (id, email, password_hash, created_at) 
    VALUES (?, ?, ?, ?)
  `
  )
    .bind(crypto.randomUUID(), email, passwordHash, new Date().toISOString())
    .run();
}

// 2. LOGIN - Verify hashed password
async function secureLogin(email, password, env) {
  // Get user from database
  const user = await env.DB.prepare(
    "SELECT id, email, password_hash FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  // Verify password against stored hash
  const isValidPassword = await verifyPassword(password, user.password_hash);

  if (!isValidPassword) {
    throw new Error("Invalid password");
  }

  // Generate secure JWT token
  const token = await generateJWT({
    id: user.id,
    email: user.email,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  return { token, user: { id: user.id, email: user.email } };
}

// 3. PASSWORD HASHING (using Web Crypto API)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt"); // Add proper salt
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 4. JWT TOKEN GENERATION
async function generateJWT(payload) {
  // In real implementation, use proper JWT library
  // with secret key and expiration
  return btoa(JSON.stringify(payload));
}
