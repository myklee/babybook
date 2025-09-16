// Simple, robust Cloudflare Worker for Baby Tracker
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight requests
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // Debug endpoint
      if (path === "/debug") {
        return new Response(
          JSON.stringify({
            message: "Simple Worker is running!",
            timestamp: new Date().toISOString(),
            hasDatabase: !!env.DB,
            path,
            method,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Auth endpoints
      if (path.startsWith("/auth/")) {
        return handleAuth(
          request,
          env,
          path.replace("/auth/", ""),
          corsHeaders
        );
      }

      // API endpoints (require auth)
      if (path.startsWith("/api/")) {
        const user = await authenticateRequest(request, env);
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return handleAPI(
          request,
          env,
          path.replace("/api/", ""),
          user,
          corsHeaders
        );
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

// Import secure auth functions
import { validateJWT } from "./secure-auth.js";

// Secure authentication
async function authenticateRequest(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const payload = await validateJWT(token, env.JWT_SECRET);
    return { id: payload.sub, email: payload.email };
  } catch (error) {
    console.error("Auth error:", error.message);
    return null;
  }
}

// Import secure auth functions
import {
  secureLogin,
  secureRegister,
  updateUserPassword,
} from "./secure-auth.js";

// Secure auth handlers
async function handleAuth(request, env, endpoint, corsHeaders) {
  if (endpoint === "login") {
    try {
      const { email, password } = await request.json();

      const result = await secureLogin(email, password, env);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message || "Login failed",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  if (endpoint === "register") {
    try {
      const { email, password } = await request.json();

      const user = await secureRegister(email, password, env);
      const result = await secureLogin(email, password, env);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message || "Registration failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // Special endpoint to set password for migrated users
  if (endpoint === "set-password") {
    try {
      const { email, password } = await request.json();

      await updateUserPassword(email, password, env);
      const result = await secureLogin(email, password, env);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message || "Password update failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// API handlers
async function handleAPI(request, env, endpoint, user, corsHeaders) {
  const method = request.method;
  const parts = endpoint.split("/");

  // Babies endpoints
  if (parts[0] === "babies") {
    if (method === "GET") {
      try {
        if (!env.DB) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const babies = await env.DB.prepare(
          "SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC"
        )
          .bind(user.id)
          .all();

        return new Response(JSON.stringify(babies.results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Get babies error:", error);
        return new Response(JSON.stringify({ error: "Failed to get babies" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (method === "POST") {
      try {
        const { name, birthdate } = await request.json();

        if (!name || !birthdate) {
          return new Response(
            JSON.stringify({ error: "Name and birthdate required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        if (!env.DB) {
          return new Response(
            JSON.stringify({ error: "Database not available" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const id = crypto.randomUUID();

        await env.DB.prepare(
          "INSERT INTO babies (id, name, birthdate, user_id, created_at) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(id, name, birthdate, user.id, new Date().toISOString())
          .run();

        const baby = {
          id,
          name,
          birthdate,
          user_id: user.id,
          created_at: new Date().toISOString(),
        };

        return new Response(JSON.stringify(baby), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Create baby error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create baby" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  // Feedings endpoints
  if (parts[0] === "feedings") {
    if (method === "GET") {
      try {
        if (!env.DB) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const feedings = await env.DB.prepare(
          "SELECT * FROM feedings WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100"
        )
          .bind(user.id)
          .all();

        return new Response(JSON.stringify(feedings.results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Get feedings error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to get feedings" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (method === "POST") {
      try {
        const data = await request.json();

        if (!data.baby_id || !data.type) {
          return new Response(
            JSON.stringify({ error: "baby_id and type required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        if (!env.DB) {
          return new Response(
            JSON.stringify({ error: "Database not available" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const id = crypto.randomUUID();
        const timestamp = data.timestamp || new Date().toISOString();

        await env.DB.prepare(
          `
          INSERT INTO feedings (
            id, baby_id, user_id, timestamp, type, amount, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
          .bind(
            id,
            data.baby_id,
            user.id,
            timestamp,
            data.type,
            data.amount || null,
            data.notes || null,
            new Date().toISOString()
          )
          .run();

        const feeding = {
          id,
          baby_id: data.baby_id,
          user_id: user.id,
          timestamp,
          type: data.type,
          amount: data.amount || null,
          notes: data.notes || null,
          created_at: new Date().toISOString(),
        };

        return new Response(JSON.stringify(feeding), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Create feeding error:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to create feeding",
            details: error.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  // Diaper changes endpoints
  if (parts[0] === "diaper_changes") {
    if (method === "GET") {
      try {
        if (!env.DB) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const changes = await env.DB.prepare(
          "SELECT * FROM diaper_changes WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100"
        )
          .bind(user.id)
          .all();

        return new Response(JSON.stringify(changes.results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Get diaper changes error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to get diaper changes" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  // Sleep sessions endpoints
  if (parts[0] === "sleep_sessions") {
    if (method === "GET") {
      try {
        if (!env.DB) {
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const sessions = await env.DB.prepare(
          "SELECT * FROM sleep_sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT 100"
        )
          .bind(user.id)
          .all();

        return new Response(JSON.stringify(sessions.results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Get sleep sessions error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to get sleep sessions" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  return new Response(JSON.stringify({ error: "Endpoint not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
