import { defineStore } from "pinia";
import { ref, onMounted, onUnmounted, watch } from "vue";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/supabase";
import { startOfToday, set } from "date-fns";
import type { 
  BreastType, 
  NursingSession, 
  ActiveNursingSession, 
  CompletedNursingSession,
  CreateNursingSessionData,
  NursingAnalytics,
  DateRange
} from "../types/nursing";
import { 
  validateDualTimerNursingSession,
  computeBreastUsed
} from "../types/nursing";
import { 
  useNursingSessionPersistence,
  type PersistedNursingSession,
  type SessionRecoveryData
} from "../composables/useNursingSessionPersistence";

type Baby = Database["public"]["Tables"]["babies"]["Row"] & {
  image_url?: string | null;
};
type Feeding = Database["public"]["Tables"]["feedings"]["Row"];
type DiaperChange = Database["public"]["Tables"]["diaper_changes"]["Row"];
type SleepSession = Database["public"]["Tables"]["sleep_sessions"]["Row"];
type BabySettings = Database["public"]["Tables"]["baby_settings"]["Row"];
type SolidFood = Database["public"]["Tables"]["solid_foods"]["Row"];

export const useBabyStore = defineStore("baby", () => {
  const babies = ref<Baby[]>([]);
  const feedings = ref<Feeding[]>([]);
  const diaperChanges = ref<DiaperChange[]>([]);
  const sleepSessions = ref<SleepSession[]>([]);
  const babySettings = ref<BabySettings[]>([]);
  const solidFoods = ref<SolidFood[]>([]);
  const isLoading = ref(false);
  const currentUser = ref<any>(null);
  const isDataLoading = ref(false); // Guard to prevent multiple simultaneous loads
  const authListenerSet = ref(false);

  // Initialize session persistence system
  const sessionPersistence = useNursingSessionPersistence();

  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  function startPolling() {
    if (pollingInterval) return; // Already polling
    pollingInterval = setInterval(async () => {
      if (currentUser.value) {
        try {
          await loadData();
        } catch (error: any) {
          // If we get auth errors during polling, stop polling
          if (error?.code === 'PGRST301' || error?.message?.includes('JWT expired') || error?.message?.includes('Auth session missing')) {
            console.log("Authentication error during polling, stopping polling");
            stopPolling();
          }
        }
      }
    }, 15000); // 15 seconds
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }



  // Initialize store and load data
  async function initializeStore() {
    console.log("Initializing store...");
    try {
      // Initialize session persistence system
      const recovery = sessionPersistence.initialize();
      if (recovery.recovered > 0) {
        console.log(`Recovered ${recovery.recovered} active nursing sessions`);
      }
      if (recovery.errors.length > 0) {
        console.warn('Session recovery errors:', recovery.errors);
      }
      
      await loadUser();
      if (currentUser.value) {
        console.log("User authenticated, loading data...");
        await loadData();
        
        // Clean up expired sessions after data load
        const expired = sessionPersistence.clearExpiredSessions();
        if (expired > 0) {
          console.log(`Cleared ${expired} expired sessions`);
        }
      } else {
        console.log("No user found, clearing data...");
        babies.value = [];
        feedings.value = [];
        diaperChanges.value = [];
        sleepSessions.value = [];
        solidFoods.value = [];
        
        // Clear active sessions if no user
        sessionPersistence.clearAllData();
      }
    } catch (error) {
      console.error("Error initializing store:", error);
      // If it's a session error, just clear the data and continue
      if (
        error instanceof Error &&
        error.message?.includes("Auth session missing")
      ) {
        console.log("No active session, clearing data and continuing...");
        currentUser.value = null;
        babies.value = [];
        feedings.value = [];
        diaperChanges.value = [];
        sleepSessions.value = [];
        solidFoods.value = [];
        sessionPersistence.clearAllData();
        return;
      }
      // For other errors, just log them but don't throw
      console.error("Store initialization error:", error);
    }
  }

  // Load current user
  async function loadUser() {
    try {
      // First, try to get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        currentUser.value = null;
        return;
      }

      if (session?.user) {
        currentUser.value = session.user;
        console.log("Session found, user loaded:", session.user.email);
      } else {
        // If no session, try to get user (this might trigger a refresh)
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          // Handle AuthSessionMissingError gracefully
          if (
            error.message?.includes("Auth session missing") ||
            error.message?.includes("AuthSessionMissingError")
          ) {
            console.log("No active session found, user needs to sign in");
            currentUser.value = null;
            return;
          }
          console.error("Error getting user:", error);
          currentUser.value = null;
          return;
        }

        currentUser.value = user;
        console.log("User loaded:", user?.email);
      }

      // Set up auth state change listener only once
      if (!authListenerSet.value) {
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("Auth state change:", event, session?.user?.email);
          currentUser.value = session?.user || null;

          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            // Only load data if not already loading
            if (!isDataLoading.value) {
              await loadData();
            }
            // Recover active sessions on sign in
            const recovery = sessionPersistence.recoverActiveSessions();
            if (recovery.recovered > 0) {
              console.log(`Recovered ${recovery.recovered} sessions on sign in`);
            }
          } else if (event === "SIGNED_OUT") {
            babies.value = [];
            feedings.value = [];
            diaperChanges.value = [];
            sleepSessions.value = [];
            solidFoods.value = [];
            // Clear active sessions on sign out
            sessionPersistence.clearAllData();
          }
        });
        authListenerSet.value = true;
      }
    } catch (error) {
      console.error("Error in loadUser:", error);
      // Handle AuthSessionMissingError gracefully
      if (
        error instanceof Error &&
        error.message?.includes("Auth session missing")
      ) {
        console.log("No active session found, user needs to sign in");
        currentUser.value = null;
        return;
      }
      currentUser.value = null;
    }
  }

  // Load all data from Supabase
  async function loadData() {
    if (!currentUser.value) {
      console.log("No current user, skipping data load");
      return;
    }

    // Prevent multiple simultaneous loads
    if (isDataLoading.value) {
      console.log("Data already loading, skipping...");
      return;
    }

    console.log("Loading data for user:", currentUser.value.email);
    isLoading.value = true;
    isDataLoading.value = true;

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn("Data loading timeout, forcing loading state to false");
      isLoading.value = false;
      isDataLoading.value = false;
    }, 15000); // Increased to 15 seconds

    try {
      // Load babies with individual timeout
      console.log("Loading babies...");
      const babiesPromise = supabase
        .from("babies")
        .select("*")
        .eq("user_id", currentUser.value.id)
        .order("created_at", { ascending: true });

      const babiesResult = (await Promise.race([
        babiesPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Babies loading timeout")), 10000),
        ),
      ])) as any;

      if (babiesResult.error) {
        console.error("Error loading babies:", babiesResult.error);
        throw babiesResult.error;
      }
      babies.value = babiesResult.data || [];
      console.log("Loaded babies:", babies.value.length);

      // Load baby settings (non-blocking)
      console.log("Loading baby settings...");
      try {
        const settingsPromise = supabase
          .from("baby_settings")
          .select("*")
          .in(
            "baby_id",
            babies.value.map((b) => b.id),
          );

        const settingsResult = (await Promise.race([
          settingsPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Settings loading timeout")),
              10000,
            ),
          ),
        ])) as any;

        if (settingsResult.error) {
          console.error("Error loading baby settings:", settingsResult.error);
          if (
            settingsResult.error.message.includes(
              'relation "baby_settings" does not exist',
            )
          ) {
            console.log("Baby settings table does not exist, skipping...");
            babySettings.value = [];
          } else {
            throw settingsResult.error;
          }
        } else {
          babySettings.value = settingsResult.data || [];
          console.log("Loaded baby settings:", babySettings.value.length);
        }
      } catch (settingsTableError) {
        if (settingsTableError.message.includes('timeout')) {
          console.warn("Baby settings loading timed out, continuing with empty data");
        } else {
          console.error("Baby settings table error:", settingsTableError);
        }
        babySettings.value = [];
      }

      // Load feedings with individual timeout
      console.log("Loading feedings...");
      const feedingsPromise = supabase
        .from("feedings")
        .select("*")
        .eq("user_id", currentUser.value.id)
        .order("timestamp", { ascending: false });

      const feedingsResult = (await Promise.race([
        feedingsPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Feedings loading timeout")), 10000),
        ),
      ])) as any;

      if (feedingsResult.error) {
        console.error("Error loading feedings:", feedingsResult.error);
        throw feedingsResult.error;
      }
      feedings.value = feedingsResult.data || [];
      console.log("Loaded feedings:", feedings.value.length);

      // Load diaper changes with individual timeout
      console.log("Loading diaper changes...");
      const diaperPromise = supabase
        .from("diaper_changes")
        .select("*")
        .eq("user_id", currentUser.value.id)
        .order("timestamp", { ascending: false });

      const diaperResult = (await Promise.race([
        diaperPromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Diaper changes loading timeout")),
            10000,
          ),
        ),
      ])) as any;

      if (diaperResult.error) {
        console.error("Error loading diaper changes:", diaperResult.error);
        throw diaperResult.error;
      }
      diaperChanges.value = diaperResult.data || [];
      console.log("Loaded diaper changes:", diaperChanges.value.length);

      // Load sleep sessions (non-blocking)
      console.log("Loading sleep sessions...");
      try {
        const sleepPromise = supabase
          .from("sleep_sessions")
          .select("*")
          .eq("user_id", currentUser.value.id)
          .order("start_time", { ascending: false });

        const sleepResult = (await Promise.race([
          sleepPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Sleep sessions loading timeout")),
              10000,
            ),
          ),
        ])) as any;

        if (sleepResult.error) {
          console.error("Error loading sleep sessions:", sleepResult.error);
          if (
            sleepResult.error.message.includes(
              'relation "sleep_sessions" does not exist',
            )
          ) {
            console.log("Sleep sessions table does not exist, skipping...");
            sleepSessions.value = [];
          } else {
            throw sleepResult.error;
          }
        } else {
          sleepSessions.value = sleepResult.data || [];
          console.log("Loaded sleep sessions:", sleepSessions.value.length);
        }
      } catch (sleepTableError) {
        console.error("Sleep sessions table error:", sleepTableError);
        sleepSessions.value = [];
      }

      // Load solid foods (non-blocking)
      console.log("Loading solid foods...");
      try {
        const solidFoodsPromise = supabase
          .from("solid_foods")
          .select("*")
          .eq("user_id", currentUser.value.id)
          .order("first_tried_date", { ascending: false });

        const solidFoodsResult = (await Promise.race([
          solidFoodsPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Solid foods loading timeout")),
              10000,
            ),
          ),
        ])) as any;

        if (solidFoodsResult.error) {
          console.error("Error loading solid foods:", solidFoodsResult.error);
          if (
            solidFoodsResult.error.message.includes(
              'relation "solid_foods" does not exist',
            )
          ) {
            console.log("Solid foods table does not exist, skipping...");
            solidFoods.value = [];
          } else {
            throw solidFoodsResult.error;
          }
        } else {
          solidFoods.value = solidFoodsResult.data || [];
          console.log("Loaded solid foods:", solidFoods.value.length);
        }
      } catch (solidFoodsTableError) {
        console.error("Solid foods table error:", solidFoodsTableError);
        solidFoods.value = [];
      }

      console.log("Data loading complete");
    } catch (error: any) {
      if (error?.message?.includes('timeout')) {
        console.warn("Data loading timed out, some data may be incomplete");
      } else {
        console.error("Error loading data:", error);
      }
      
      // Handle JWT expiration specifically
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT expired')) {
        console.log("JWT expired, attempting to refresh session...");
        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error("Failed to refresh session:", refreshError);
            // Clear user and stop polling on refresh failure
            currentUser.value = null;
            stopPolling();
            // Clear data
            babies.value = [];
            feedings.value = [];
            diaperChanges.value = [];
            sleepSessions.value = [];
            solidFoods.value = [];
            babySettings.value = [];
          } else if (data.session) {
            console.log("Session refreshed successfully");
            currentUser.value = data.session.user;
            // Don't retry immediately, let the next polling cycle handle it
          }
        } catch (refreshError) {
          console.error("Error refreshing session:", refreshError);
          currentUser.value = null;
          stopPolling();
        }
      }
      // Don't clear existing data on other errors, just log them
    } finally {
      clearTimeout(timeoutId);
      isLoading.value = false;
      isDataLoading.value = false;
      console.log("Loading state set to false");
    }
  }

  // Add a new baby
  async function addBaby(name: string, birthdate?: string, imageFile?: File) {
    if (!currentUser.value) throw new Error("User not authenticated");

    let imageUrl: string | undefined = undefined;
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop()?.toLowerCase();
      const timestamp = Date.now();
      const newImageKey = `new-baby-${timestamp}.${fileExt}`;

      console.log(
        "Uploading file:",
        newImageKey,
        "Size:",
        imageFile.size,
        "Type:",
        imageFile.type,
      );

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("baby-images")
        .upload(newImageKey, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);
      const {
        data: { publicUrl },
      } = supabase.storage.from("baby-images").getPublicUrl(uploadData.path);
      imageUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from("babies")
      .insert({
        name,
        birthdate: birthdate || null,
        user_id: currentUser.value.id,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      throw error;
    }

    babies.value.push(data);

    // Create default baby settings
    try {
      await createBabySettings(data.id);
    } catch (settingsError) {
      console.error("Error creating baby settings:", settingsError);
      // Don't throw here, as the baby was created successfully
    }

    return data;
  }

  // Update a baby
  async function updateBaby(
    id: string,
    updates: { name?: string; birthdate?: string; imageFile?: File },
  ) {
    if (!currentUser.value) throw new Error("User not authenticated");

    let imageUrl: string | undefined;

    if (updates.imageFile) {
      // Remove old image if it exists
      const currentBaby = babies.value.find((b) => b.id === id);
      if (currentBaby?.image_url) {
        const oldImageKey = currentBaby.image_url.split("/").pop();
        if (oldImageKey) {
          await supabase.storage.from("baby-images").remove([oldImageKey]);
        }
      }

      const file = updates.imageFile;
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const timestamp = Date.now();
      const newImageKey = `baby-${id}-${timestamp}.${fileExt}`;

      console.log(
        "Uploading file:",
        newImageKey,
        "Size:",
        file.size,
        "Type:",
        file.type,
      );

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("baby-images")
        .upload(newImageKey, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);
      const {
        data: { publicUrl },
      } = supabase.storage.from("baby-images").getPublicUrl(uploadData.path);
      imageUrl = publicUrl;
    }

    const dbUpdates: { name?: string; birthdate?: string; image_url?: string } =
      {};
    if (updates.name) {
      dbUpdates.name = updates.name;
    }
    if (updates.birthdate) {
      dbUpdates.birthdate = updates.birthdate;
    }
    if (imageUrl) {
      dbUpdates.image_url = imageUrl;
    }

    console.log("Updating baby with:", dbUpdates);

    const { data, error } = await supabase
      .from("babies")
      .update(dbUpdates)
      .eq("id", id)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      throw error;
    }

    const index = babies.value.findIndex((b) => b.id === id);
    if (index !== -1) {
      babies.value[index] = data;
    }

    return data;
  }

  // Delete a baby and all associated data
  async function deleteBaby(id: string) {
    if (!currentUser.value) throw new Error("User not authenticated");

    try {
      // Delete baby settings first
      await supabase.from("baby_settings").delete().eq("baby_id", id);

      // Delete all feedings for this baby
      await supabase.from("feedings").delete().eq("baby_id", id);

      // Delete all diaper changes for this baby
      await supabase.from("diaper_changes").delete().eq("baby_id", id);

      // Delete all sleep sessions for this baby
      await supabase.from("sleep_sessions").delete().eq("baby_id", id);

      // Delete all solid foods for this baby
      await supabase.from("solid_foods").delete().eq("baby_id", id);

      // Delete the baby image if it exists
      const baby = babies.value.find((b) => b.id === id);
      if (baby?.image_url) {
        const imageKey = baby.image_url.split("/").pop();
        if (imageKey) {
          await supabase.storage.from("baby-images").remove([imageKey]);
        }
      }

      // Finally, delete the baby
      const { error } = await supabase
        .from("babies")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.value.id);

      if (error) {
        console.error("Database delete error:", error);
        throw error;
      }

      // Remove from local state
      const index = babies.value.findIndex((b) => b.id === id);
      if (index !== -1) {
        babies.value.splice(index, 1);
      }

      return true;
    } catch (error) {
      console.error("Error deleting baby:", error);
      throw error;
    }
  }

  // Ensure session is valid before database operations
  async function ensureValidSession() {
    if (!currentUser.value) {
      console.log("No current user, trying to load user...");
      await loadUser();
      if (!currentUser.value) {
        throw new Error("No authenticated user found. Please sign in again.");
      }
    }

    // Check if session is still valid with timeout
    try {
      const sessionPromise = supabase.auth.getSession();
      const sessionResult = (await Promise.race([
        sessionPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session check timeout")), 3000),
        ),
      ])) as any;

      if (sessionResult.error || !sessionResult.data.session) {
        console.log("Session invalid, trying to refresh...");
        await loadUser();
        if (!currentUser.value) {
          throw new Error("Session expired. Please sign in again.");
        }
      }
    } catch (error) {
      console.error("Session validation error:", error);
      // If session check times out, try to load user anyway
      await loadUser();
      if (!currentUser.value) {
        throw new Error("Session validation failed. Please sign in again.");
      }
    }
  }

  // Add a new feeding
  async function addFeeding(
    babyId: string,
    amount: number,
    type: Feeding["type"],
    notes?: string,
    timestamp?: Date,
  ) {
    try {
      await ensureValidSession();

      const feedingData = {
        baby_id: babyId,
        timestamp: timestamp
          ? timestamp.toISOString()
          : new Date().toISOString(),
        amount,
        type,
        notes: notes || null,
        user_id: currentUser.value!.id,
        start_time: null,
        end_time: null,
      };

      const { data, error } = await supabase
        .from("feedings")
        .insert(feedingData)
        .select()
        .single();

      if (error) {
        console.error("Error adding feeding:", error);
        throw error;
      }

      feedings.value.unshift(data);
      return data;
    } catch (error) {
      console.error("Error in addFeeding:", error);
      throw error;
    }
  }

  // Add a new nursing session (with start/end times)
  async function addNursingSession(
    babyId: string,
    startTime: Date,
    endTime?: Date,
    notes?: string,
  ) {
    try {
      await ensureValidSession();

      const feedingData = {
        baby_id: babyId,
        timestamp: startTime.toISOString(), // Keep timestamp for compatibility
        amount: null,
        type: "nursing" as const,
        notes: notes || null,
        user_id: currentUser.value!.id,
        start_time: startTime.toISOString(),
        end_time: endTime ? endTime.toISOString() : null,
      };

      const { data, error } = await supabase
        .from("feedings")
        .insert(feedingData)
        .select()
        .single();

      if (error) {
        console.error("Error adding nursing session:", error);
        throw error;
      }

      feedings.value.unshift(data);
      return data;
    } catch (error) {
      console.error("Error in addNursingSession:", error);
      throw error;
    }
  }

  // Save nursing session with dual-timer durations (automatic time handling)
  async function saveNursingSession(
    babyId: string,
    leftDuration: number,
    rightDuration: number,
    notes?: string,
    startTime?: Date
  ): Promise<NursingSession> {
    try {
      await ensureValidSession();

      // Validate dual-timer data with automatic timing
      const validation = validateDualTimerNursingSession(leftDuration, rightDuration, startTime);
      if (!validation.is_valid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }

      // Determine breast used based on durations
      const breastUsed = computeBreastUsed(leftDuration, rightDuration);
      const totalDuration = leftDuration + rightDuration;
      
      // Automatic time handling: Use provided start time or calculate from current time
      const endTime = new Date();
      const sessionStartTime = startTime || new Date(endTime.getTime() - (totalDuration * 1000));

      const sessionData = {
        baby_id: babyId,
        timestamp: endTime.toISOString(), // End time for compatibility
        amount: null,
        type: "nursing" as const,
        notes: notes || null,
        user_id: currentUser.value!.id,
        start_time: sessionStartTime.toISOString(), // Automatically captured start time
        end_time: endTime.toISOString(), // Automatically captured end time
        breast_used: breastUsed,
        left_duration: leftDuration, // Automatically calculated from timers
        right_duration: rightDuration, // Automatically calculated from timers
        total_duration: totalDuration, // Automatically calculated total
      };

      const { data, error } = await supabase
        .from("feedings")
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error("Error saving nursing session:", error);
        throw error;
      }

      feedings.value.unshift(data);
      
      // Clear any active session for this baby after successful save
      if (sessionPersistence.getActiveSession(babyId)) {
        sessionPersistence.removeActiveSession(babyId);
      }
      
      return data as NursingSession;
    } catch (error) {
      console.error("Error in saveNursingSession:", error);
      throw error;
    }
  }

  // Start a new nursing session with breast selection
  async function startNursingSession(
    babyId: string, 
    breastUsed: BreastType, 
    notes?: string
  ): Promise<NursingSession> {
    try {
      await ensureValidSession();

      // Check if there's already an active nursing session for this baby
      const existingSession = feedings.value.find(
        (f) => f.baby_id === babyId && f.type === "nursing" && f.start_time && !f.end_time
      );

      if (existingSession) {
        throw new Error("There is already an active nursing session for this baby");
      }

      const startTime = new Date();
      const sessionData = {
        baby_id: babyId,
        timestamp: startTime.toISOString(),
        amount: null,
        type: "nursing" as const,
        notes: notes || null,
        user_id: currentUser.value!.id,
        start_time: startTime.toISOString(),
        end_time: null,
        breast_used: breastUsed,
      };

      const { data, error } = await supabase
        .from("feedings")
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error("Error starting nursing session:", error);
        throw error;
      }

      feedings.value.unshift(data);
      return data as NursingSession;
    } catch (error) {
      console.error("Error in startNursingSession:", error);
      throw error;
    }
  }

  // End the current nursing session (set end_time to now)
  async function endNursingSession(babyId: string) {
    if (!currentUser.value) throw new Error("User not authenticated");
    
    const openSession = feedings.value.find(
      (f) => f.baby_id === babyId && f.type === "nursing" && f.start_time && !f.end_time,
    );
    
    if (!openSession) throw new Error("No open nursing session found");
    
    const { data, error } = await supabase
      .from("feedings")
      .update({ end_time: new Date().toISOString() })
      .eq("id", openSession.id)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();
    
    if (error) throw error;
    
    const index = feedings.value.findIndex((f) => f.id === openSession.id);
    if (index !== -1) feedings.value[index] = data;
    return data;
  }

  // Check if a baby is currently nursing (has an open session)
  function isBabyNursing(babyId: string) {
    return feedings.value.some(
      (f) => f.baby_id === babyId && f.type === "nursing" && f.start_time && !f.end_time
    );
  }

  // Get active nursing session for a baby (enhanced with persistence)
  function getActiveNursingSession(babyId: string): ActiveNursingSession | null {
    // First check if we have a persisted active session
    const persistedSession = sessionPersistence.getActiveSession(babyId);
    if (persistedSession && persistedSession.is_active) {
      const startTime = new Date(persistedSession.start_time);
      const now = new Date();
      const durationMs = now.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const elapsedDisplay = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}:${Math.floor((durationMs % 60000) / 1000).toString().padStart(2, '0')}`;

      return {
        id: persistedSession.id,
        baby_id: persistedSession.baby_id,
        timestamp: persistedSession.start_time,
        amount: null,
        type: "nursing" as const,
        notes: persistedSession.notes,
        user_id: currentUser.value?.id || '',
        start_time: persistedSession.start_time,
        end_time: null,
        breast_used: persistedSession.current_breast,
        left_duration: persistedSession.left_duration,
        right_duration: persistedSession.right_duration,
        total_duration: persistedSession.left_duration + persistedSession.right_duration,
        created_at: persistedSession.start_time,
        is_active: true,
        duration_minutes: durationMinutes,
        elapsed_display: elapsedDisplay,
      } as ActiveNursingSession;
    }

    // Fallback to database check for active sessions
    const activeSession = feedings.value.find(
      (f) => f.baby_id === babyId && f.type === "nursing" && f.start_time && !f.end_time
    ) as NursingSession | undefined;

    if (!activeSession) return null;

    const startTime = new Date(activeSession.start_time);
    const now = new Date();
    const durationMs = now.getTime() - startTime.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const elapsedDisplay = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}:${Math.floor((durationMs % 60000) / 1000).toString().padStart(2, '0')}`;

    return {
      ...activeSession,
      is_active: true,
      duration_minutes: durationMinutes,
      elapsed_display: elapsedDisplay,
    } as ActiveNursingSession;
  }

  // Start a new active nursing session with persistence
  function startActiveNursingSession(
    babyId: string, 
    breastUsed: BreastType, 
    notes: string = ''
  ): PersistedNursingSession {
    // Check if there's already an active session for this baby
    if (sessionPersistence.getActiveSession(babyId)) {
      throw new Error('There is already an active nursing session for this baby');
    }

    const now = new Date();
    const sessionId = `nursing_${babyId}_${now.getTime()}`;
    
    const newSession: PersistedNursingSession = {
      id: sessionId,
      baby_id: babyId,
      start_time: now.toISOString(),
      current_breast: breastUsed,
      left_duration: 0,
      right_duration: 0,
      notes,
      last_update: now.toISOString(),
      device_id: sessionPersistence.deviceId,
      is_active: true
    };

    const success = sessionPersistence.addActiveSession(newSession);
    if (!success) {
      throw new Error('Failed to create active nursing session');
    }

    return newSession;
  }

  // Update active nursing session
  function updateActiveNursingSession(
    babyId: string,
    updates: {
      current_breast?: BreastType;
      left_duration?: number;
      right_duration?: number;
      notes?: string;
    }
  ): void {
    const session = sessionPersistence.getActiveSession(babyId);
    if (!session || !session.is_active) {
      throw new Error('No active nursing session found for this baby');
    }

    // Update the session using the persistence system
    const success = sessionPersistence.updateActiveSession(babyId, updates);
    if (!success) {
      throw new Error('Failed to update active nursing session');
    }
  }

  // End active nursing session and save to database
  async function endActiveNursingSession(babyId: string): Promise<NursingSession> {
    const session = sessionPersistence.getActiveSession(babyId);
    if (!session || !session.is_active) {
      throw new Error('No active nursing session found for this baby');
    }

    try {
      await ensureValidSession();

      // Determine breast used based on durations
      const breastUsed = computeBreastUsed(session.left_duration, session.right_duration);
      const totalDuration = session.left_duration + session.right_duration;
      const endTime = new Date();

      const sessionData = {
        baby_id: babyId,
        timestamp: endTime.toISOString(),
        amount: null,
        type: "nursing" as const,
        notes: session.notes || null,
        user_id: currentUser.value!.id,
        start_time: session.start_time,
        end_time: endTime.toISOString(),
        breast_used: breastUsed,
        left_duration: session.left_duration,
        right_duration: session.right_duration,
        total_duration: totalDuration,
      };

      const { data, error } = await supabase
        .from("feedings")
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error("Error saving nursing session:", error);
        throw error;
      }

      // Remove from active sessions using persistence system
      sessionPersistence.removeActiveSession(babyId);

      // Add to feedings array
      feedings.value.unshift(data);
      
      return data as NursingSession;
    } catch (error) {
      console.error("Error in endActiveNursingSession:", error);
      throw error;
    }
  }

  // Cancel active nursing session without saving
  function cancelActiveNursingSession(babyId: string): void {
    const session = sessionPersistence.getActiveSession(babyId);
    if (!session || !session.is_active) {
      throw new Error('No active nursing session found for this baby');
    }

    // Remove from active sessions using persistence system
    sessionPersistence.removeActiveSession(babyId);
  }

  // Get all active nursing sessions
  function getAllActiveNursingSessions(): Map<string, PersistedNursingSession> {
    return sessionPersistence.getAllActiveSessions();
  }

  // Check if any baby has an active nursing session
  function hasAnyActiveNursingSession(): boolean {
    return sessionPersistence.hasActiveSessions();
  }

  // Get session recovery data for debugging
  function getSessionRecoveryData(): SessionRecoveryData[] {
    return sessionPersistence.getRecoveryData();
  }

  // Update nursing session notes
  async function updateNursingNotes(sessionId: string, notes: string): Promise<void> {
    try {
      await ensureValidSession();

      const { error } = await supabase
        .from("feedings")
        .update({ notes })
        .eq("id", sessionId)
        .eq("user_id", currentUser.value!.id)
        .eq("type", "nursing");

      if (error) {
        console.error("Error updating nursing notes:", error);
        throw error;
      }

      // Update local state
      const index = feedings.value.findIndex((f) => f.id === sessionId);
      if (index !== -1) {
        feedings.value[index].notes = notes;
      }
    } catch (error) {
      console.error("Error in updateNursingNotes:", error);
      throw error;
    }
  }

  // Update a nursing session
  async function updateNursingSession(
    id: string,
    updates: Partial<Omit<NursingSession, "id" | "baby_id" | "user_id" | "created_at">>
  ): Promise<NursingSession> {
    try {
      await ensureValidSession();

      const { data, error } = await supabase
        .from("feedings")
        .update(updates)
        .eq("id", id)
        .eq("user_id", currentUser.value!.id)
        .eq("type", "nursing")
        .select()
        .single();

      if (error) {
        console.error("Error updating nursing session:", error);
        throw error;
      }

      // Update local state
      const index = feedings.value.findIndex((f) => f.id === id);
      if (index !== -1) {
        feedings.value[index] = data;
      }

      return data as NursingSession;
    } catch (error) {
      console.error("Error in updateNursingSession:", error);
      throw error;
    }
  }

  // Delete a nursing session
  async function deleteNursingSession(id: string): Promise<boolean> {
    try {
      await ensureValidSession();

      const { error } = await supabase
        .from("feedings")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.value!.id)
        .eq("type", "nursing");

      if (error) {
        console.error("Error deleting nursing session:", error);
        throw error;
      }

      // Remove from local state
      const index = feedings.value.findIndex((f) => f.id === id);
      if (index !== -1) {
        feedings.value.splice(index, 1);
      }

      return true;
    } catch (error) {
      console.error("Error in deleteNursingSession:", error);
      throw error;
    }
  }

  // Get nursing sessions for a baby
  function getNursingSessions(babyId: string): NursingSession[] {
    return feedings.value
      .filter((f) => f.baby_id === babyId && f.type === "nursing")
      .map((f) => f as NursingSession)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }

  // Get completed nursing sessions for a baby
  function getCompletedNursingSessions(babyId: string): CompletedNursingSession[] {
    return feedings.value
      .filter((f) => f.baby_id === babyId && f.type === "nursing" && f.end_time)
      .map((f) => {
        const session = f as NursingSession;
        const startTime = new Date(session.start_time);
        const endTime = new Date(session.end_time!);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationDisplay = durationMinutes >= 60 
          ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
          : `${durationMinutes} minutes`;

        return {
          ...session,
          is_active: false,
          duration_minutes: durationMinutes,
          duration_display: durationDisplay,
        } as CompletedNursingSession;
      })
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }

  // Get nursing summary for today
  function getTodaysNursingSummary(babyId: string) {
    const today = startOfToday();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const todaysSessions = feedings.value
      .filter((f) => f.baby_id === babyId && f.type === "nursing")
      .filter((session) => {
        const sessionDate = new Date(session.start_time || session.timestamp);
        return sessionDate >= today && sessionDate < tomorrow;
      });

    const totalSessions = todaysSessions.length;
    const totalDurationMinutes = Math.floor(
      todaysSessions.reduce((sum, session) => {
        return sum + (session.left_duration || 0) + (session.right_duration || 0);
      }, 0) / 60
    );

    const leftSessions = todaysSessions.filter(s => (s.left_duration || 0) > 0).length;
    const rightSessions = todaysSessions.filter(s => (s.right_duration || 0) > 0).length;
    const bothSessions = todaysSessions.filter(s => (s.left_duration || 0) > 0 && (s.right_duration || 0) > 0).length;

    return {
      total_sessions: totalSessions,
      total_duration_minutes: totalDurationMinutes,
      left_sessions: leftSessions,
      right_sessions: rightSessions,
      both_sessions: bothSessions,
      average_duration: totalSessions > 0 ? Math.round(totalDurationMinutes / totalSessions) : 0
    };
  }

  // Get weekly nursing summary
  function getWeeklyNursingSummary(babyId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return getNursingAnalytics(babyId, { start: weekAgo, end: now });
  }

  // Get breast usage balance (percentage difference between left and right)
  function getBreastUsageBalance(babyId: string, days: number = 7): { balance: number; recommendation: string } {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const sessions = feedings.value
      .filter((f) => f.baby_id === babyId && f.type === "nursing")
      .filter((session) => {
        const sessionDate = new Date(session.start_time || session.timestamp);
        return sessionDate >= startDate;
      });

    const totalLeftDuration = sessions.reduce((sum, s) => sum + (s.left_duration || 0), 0);
    const totalRightDuration = sessions.reduce((sum, s) => sum + (s.right_duration || 0), 0);
    const totalDuration = totalLeftDuration + totalRightDuration;

    if (totalDuration === 0) {
      return { balance: 0, recommendation: "No nursing sessions recorded yet" };
    }

    const leftPercentage = (totalLeftDuration / totalDuration) * 100;
    const rightPercentage = (totalRightDuration / totalDuration) * 100;
    const balance = Math.abs(leftPercentage - rightPercentage);

    let recommendation = "";
    if (balance < 10) {
      recommendation = "Great balance between both breasts";
    } else if (balance < 20) {
      recommendation = leftPercentage > rightPercentage 
        ? "Consider using right breast more often" 
        : "Consider using left breast more often";
    } else {
      recommendation = leftPercentage > rightPercentage 
        ? "Try to use right breast more to maintain balance" 
        : "Try to use left breast more to maintain balance";
    }

    return { balance: Math.round(balance), recommendation };
  }

  // Calculate nursing analytics for a baby with enhanced dual-timer support
  function getNursingAnalytics(babyId: string, dateRange?: DateRange): NursingAnalytics {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const start = dateRange?.start || defaultStart;
    const end = dateRange?.end || now;

    // Get nursing sessions with duration data
    const nursingSessions = feedings.value
      .filter((f) => f.baby_id === babyId && f.type === "nursing")
      .map((f) => f as NursingSession)
      .filter((session) => {
        const sessionDate = new Date(session.start_time);
        return sessionDate >= start && sessionDate <= end;
      });

    const totalSessions = nursingSessions.length;
    
    // Calculate total duration from individual breast durations
    const totalDurationSeconds = nursingSessions.reduce((sum, session) => {
      return sum + (session.left_duration || 0) + (session.right_duration || 0);
    }, 0);
    const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);
    const averageDurationMinutes = totalSessions > 0 ? Math.round(totalDurationMinutes / totalSessions) : 0;

    // Enhanced breast usage statistics with individual durations
    const leftCount = nursingSessions.filter(s => (s.left_duration || 0) > 0).length;
    const rightCount = nursingSessions.filter(s => (s.right_duration || 0) > 0).length;
    const bothCount = nursingSessions.filter(s => (s.left_duration || 0) > 0 && (s.right_duration || 0) > 0).length;

    // Calculate total time spent on each breast
    const totalLeftDurationMinutes = Math.floor(nursingSessions.reduce((sum, s) => sum + (s.left_duration || 0), 0) / 60);
    const totalRightDurationMinutes = Math.floor(nursingSessions.reduce((sum, s) => sum + (s.right_duration || 0), 0) / 60);

    const leftPercentage = totalSessions > 0 ? Math.round((leftCount / totalSessions) * 100) : 0;
    const rightPercentage = totalSessions > 0 ? Math.round((rightCount / totalSessions) * 100) : 0;
    const bothPercentage = totalSessions > 0 ? Math.round((bothCount / totalSessions) * 100) : 0;

    // Daily totals with enhanced duration tracking
    const dailyTotals: Array<{ 
      date: string; 
      sessions: number; 
      duration_minutes: number;
      left_duration_minutes: number;
      right_duration_minutes: number;
    }> = [];
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      
      const daySessions = nursingSessions.filter((session) => {
        const sessionDate = new Date(session.start_time);
        return sessionDate >= dayStart && sessionDate < dayEnd;
      });

      const dayLeftDuration = Math.floor(daySessions.reduce((sum, s) => sum + (s.left_duration || 0), 0) / 60);
      const dayRightDuration = Math.floor(daySessions.reduce((sum, s) => sum + (s.right_duration || 0), 0) / 60);

      dailyTotals.push({
        date: dateStr,
        sessions: daySessions.length,
        duration_minutes: dayLeftDuration + dayRightDuration,
        left_duration_minutes: dayLeftDuration,
        right_duration_minutes: dayRightDuration,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Session patterns with enhanced duration analysis
    const sessionDurations = nursingSessions.map(s => Math.floor(((s.left_duration || 0) + (s.right_duration || 0)) / 60));
    const leftDurations = nursingSessions.filter(s => (s.left_duration || 0) > 0).map(s => Math.floor((s.left_duration || 0) / 60));
    const rightDurations = nursingSessions.filter(s => (s.right_duration || 0) > 0).map(s => Math.floor((s.right_duration || 0) / 60));
    
    const hourCounts = new Array(24).fill(0);
    nursingSessions.forEach((session) => {
      const hour = new Date(session.start_time).getHours();
      hourCounts[hour]++;
    });

    const peakHours = hourCounts
      .map((count, hour) => ({ hour, session_count: count }))
      .filter(h => h.session_count > 0)
      .sort((a, b) => b.session_count - a.session_count)
      .slice(0, 3);

    return {
      baby_id: babyId,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      total_sessions: totalSessions,
      total_duration_minutes: totalDurationMinutes,
      average_duration_minutes: averageDurationMinutes,
      breast_usage: {
        left: leftCount,
        right: rightCount,
        both: bothCount,
        left_percentage: leftPercentage,
        right_percentage: rightPercentage,
        both_percentage: bothPercentage,
        left_total_duration_minutes: totalLeftDurationMinutes,
        right_total_duration_minutes: totalRightDurationMinutes,
      },
      daily_totals: dailyTotals,
      session_patterns: {
        most_common_duration: sessionDurations.length > 0 ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length) : 0,
        longest_session: sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0,
        shortest_session: sessionDurations.length > 0 ? Math.min(...sessionDurations) : 0,
        peak_hours: peakHours,
        average_left_duration: leftDurations.length > 0 ? Math.round(leftDurations.reduce((a, b) => a + b, 0) / leftDurations.length) : 0,
        average_right_duration: rightDurations.length > 0 ? Math.round(rightDurations.reduce((a, b) => a + b, 0) / rightDurations.length) : 0,
      },
    };
  }

  // Validate nursing session data (enhanced for dual-timer)
  function validateNursingSession(data: CreateNursingSessionData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.baby_id) {
      errors.push("Baby ID is required");
    }

    // For dual-timer sessions, validate durations instead of breast_used
    if (data.left_duration !== undefined && data.right_duration !== undefined) {
      const validation = validateDualTimerNursingSession(data.left_duration, data.right_duration);
      if (!validation.is_valid) {
        errors.push(...validation.errors.map(e => e.message));
      }
    } else if (!data.breast_used || !['left', 'right', 'both'].includes(data.breast_used)) {
      errors.push("Valid breast selection is required");
    }

    if (data.start_time && data.start_time > new Date()) {
      errors.push("Start time cannot be in the future");
    }

    // Check for existing active session
    const existingSession = feedings.value.find(
      (f) => f.baby_id === data.baby_id && f.type === "nursing" && f.start_time && !f.end_time
    );

    if (existingSession) {
      errors.push("There is already an active nursing session for this baby");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate dual-timer nursing session data
  function validateDualTimerSession(leftDuration: number, rightDuration: number): { isValid: boolean; errors: string[]; warnings: string[] } {
    const validation = validateDualTimerNursingSession(leftDuration, rightDuration);
    return {
      isValid: validation.is_valid,
      errors: validation.errors.map(e => e.message),
      warnings: validation.warnings.map(w => w.message),
    };
  }

  // Format nursing duration for display
  function formatNursingDuration(durationMinutes: number): string {
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    return `${hours}h ${minutes}m`;
  }

  // Get nursing session duration in real-time
  function getNursingSessionDuration(sessionId: string): number {
    const session = feedings.value.find(f => f.id === sessionId && f.type === "nursing");
    if (!session || !session.start_time) return 0;

    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : new Date();
    
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  // Add top-up to an existing breast feeding
  async function addTopUpToFeeding(feedingId: string, topupAmount: number) {
    if (!currentUser.value) throw new Error("User not authenticated");

    // First, get the current feeding to verify it's a breast feeding
    const currentFeeding = feedings.value.find((f) => f.id === feedingId);
    if (!currentFeeding) throw new Error("Feeding not found");
    if (currentFeeding.type !== "breast" && currentFeeding.type !== "nursing")
      throw new Error("Can only add top-up to breast and nursing feedings");

    const { data, error } = await supabase
      .from("feedings")
      .update({ topup_amount: topupAmount })
      .eq("id", feedingId)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();

    if (error) throw error;

    // Update the local state
    const index = feedings.value.findIndex((f) => f.id === feedingId);
    if (index !== -1) {
      feedings.value[index] = data;
    }

    return data;
  }

  // Add a new diaper change
  async function addDiaperChange(
    babyId: string,
    type: "pee" | "poop" | "both",
    notes?: string,
    timestamp?: Date,
  ) {
    try {
      await ensureValidSession();

      const diaperData = {
        baby_id: babyId,
        timestamp: timestamp
          ? timestamp.toISOString()
          : new Date().toISOString(),
        type,
        notes: notes || null,
        user_id: currentUser.value!.id,
      };

      const { data, error } = await supabase
        .from("diaper_changes")
        .insert(diaperData)
        .select()
        .single();

      if (error) {
        console.error("Error adding diaper change:", error);
        throw error;
      }

      diaperChanges.value.unshift(data);
      return data;
    } catch (error) {
      console.error("Error in addDiaperChange:", error);
      throw error;
    }
  }

  // Add a new sleep session
  async function addSleepSession(
    babyId: string,
    startTime: Date,
    endTime?: Date,
    notes?: string,
  ) {
    if (!currentUser.value) throw new Error("User not authenticated");
    const { data, error } = await supabase
      .from("sleep_sessions")
      .insert({
        baby_id: babyId,
        start_time: startTime.toISOString(),
        end_time: endTime ? endTime.toISOString() : null,
        notes: notes || null,
        user_id: currentUser.value.id,
      })
      .select()
      .single();
    if (error) throw error;
    sleepSessions.value.unshift(data);
    return data;
  }

  // Update a feeding
  async function updateFeeding(
    id: string,
    updates: Partial<
      Omit<Feeding, "id" | "baby_id" | "user_id" | "created_at">
    >,
  ) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("feedings")
      .update(updates)
      .eq("id", id)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();

    if (error) throw error;

    const index = feedings.value.findIndex((f) => f.id === id);
    if (index !== -1) {
      feedings.value[index] = data;
    }

    return data;
  }

  // Update a diaper change
  async function updateDiaperChange(
    id: string,
    updates: Partial<
      Omit<DiaperChange, "id" | "baby_id" | "user_id" | "created_at">
    >,
  ) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("diaper_changes")
      .update(updates)
      .eq("id", id)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();

    if (error) throw error;

    const index = diaperChanges.value.findIndex((d) => d.id === id);
    if (index !== -1) {
      diaperChanges.value[index] = data;
    }

    return data;
  }

  // Update a sleep session
  async function updateSleepSession(
    id: string,
    updates: Partial<
      Omit<SleepSession, "id" | "baby_id" | "user_id" | "created_at">
    >,
  ) {
    if (!currentUser.value) throw new Error("User not authenticated");
    const { data, error } = await supabase
      .from("sleep_sessions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();
    if (error) throw error;
    const index = sleepSessions.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      sleepSessions.value[index] = data;
    }
    return data;
  }

  // Delete a feeding
  async function deleteFeeding(id: string) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("feedings")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.value.id);

    if (error) throw error;

    const index = feedings.value.findIndex((f) => f.id === id);
    if (index !== -1) {
      feedings.value.splice(index, 1);
    }

    return true;
  }

  // Delete a diaper change
  async function deleteDiaperChange(id: string) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("diaper_changes")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.value.id);

    if (error) throw error;

    const index = diaperChanges.value.findIndex((d) => d.id === id);
    if (index !== -1) {
      diaperChanges.value.splice(index, 1);
    }

    return true;
  }

  // Delete a sleep session
  async function deleteSleepSession(id: string) {
    if (!currentUser.value) throw new Error("User not authenticated");
    const { error } = await supabase
      .from("sleep_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.value.id);
    if (error) throw error;
    const index = sleepSessions.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      sleepSessions.value.splice(index, 1);
    }
    return true;
  }

  // Get feedings for a specific baby
  function getBabyFeedings(babyId: string) {
    return feedings.value
      .filter((f) => f.baby_id === babyId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }

  // Get diaper changes for a specific baby
  function getBabyDiaperChanges(babyId: string) {
    return diaperChanges.value
      .filter((d) => d.baby_id === babyId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }

  // Get sleep sessions for a specific baby
  function getBabySleepSessions(babyId: string) {
    return sleepSessions.value
      .filter((s) => s.baby_id === babyId)
      .sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
      );
  }

  // Sign in with email/password
  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Manually update the current user and load data
    if (data.user) {
      currentUser.value = data.user;
      console.log("User signed in successfully:", data.user.email);

      // Load data for the newly signed-in user
      try {
        await loadData();
      } catch (loadError) {
        console.error("Error loading data after sign in:", loadError);
        // Don't throw this error as the sign-in was successful
      }
    }
  }

  // Sign up with email/password
  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  }

  // Sign out
  async function signOut() {
    // If no current user, just clear local state
    if (!currentUser.value) {
      console.log("No active session to sign out from");
      currentUser.value = null;
      babies.value = [];
      feedings.value = [];
      diaperChanges.value = [];
      sleepSessions.value = [];
      solidFoods.value = [];
      babySettings.value = [];
      stopPolling();
      return;
    }

    try {
      // Try to sign out from Supabase, but don't fail if it doesn't work
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase sign out error:", error);
        // Continue with local cleanup even if remote sign out fails
      }
    } catch (error) {
      console.error("Sign out error:", error);
      // Continue with local cleanup even if remote sign out fails
    } finally {
      // Always clear local state and session storage
      currentUser.value = null;
      babies.value = [];
      feedings.value = [];
      diaperChanges.value = [];
      sleepSessions.value = [];
      solidFoods.value = [];
      babySettings.value = [];
      stopPolling();

      // Clear active nursing sessions
      sessionPersistence.clearAllData();

      // Clear any stored session data
      try {
        localStorage.removeItem("babybook-auth");
        sessionStorage.removeItem("babybook-auth");
        localStorage.removeItem("baby-app-active-nursing-sessions");
      } catch (storageError) {
        console.error("Error clearing storage:", storageError);
      }
    }
  }

  function getTodaysFeedingsTotal(babyId: string) {
    const now = new Date();
    const today = startOfToday();
    let eightAm;

    // If it's already past 8 AM today, the window started at 8 AM today.
    if (now.getHours() >= 8) {
      eightAm = set(today, {
        hours: 8,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
    } else {
      // If it's before 8 AM today, the window started at 8 AM *yesterday*.
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      eightAm = set(yesterday, {
        hours: 8,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
    }

    const relevantFeedings = feedings.value.filter((feeding) => {
      const feedingTimestamp = new Date(feeding.timestamp);
      return (
        feeding.baby_id === babyId &&
        (feeding.type === "breast" || feeding.type === "formula") &&
        feeding.amount != null &&
        feedingTimestamp >= eightAm
      );
    });

    return relevantFeedings.reduce((sum, feeding) => {
      const baseAmount = feeding.amount || 0;
      const topupAmount = (feeding as any).topup_amount || 0;
      return sum + baseAmount + topupAmount;
    }, 0);
  }

  // Get baby settings
  function getBabySettings(babyId: string) {
    return babySettings.value.find((s) => s.baby_id === babyId) || null;
  }

  // Update baby settings
  async function updateBabySettings(
    babyId: string,
    updates: {
      feeding_interval_hours?: number;
      default_breast_amount?: number;
      default_formula_amount?: number;
    },
  ) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("baby_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("baby_id", babyId)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      throw error;
    }

    // Update local state
    const index = babySettings.value.findIndex((s) => s.baby_id === babyId);
    if (index !== -1) {
      babySettings.value[index] = data;
    } else {
      babySettings.value.push(data);
    }

    return data;
  }

  // Create baby settings (called when adding a new baby)
  async function createBabySettings(babyId: string) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("baby_settings")
      .insert({
        baby_id: babyId,
        feeding_interval_hours: 3,
        default_breast_amount: 0,
        default_formula_amount: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      throw error;
    }

    babySettings.value.push(data);
    return data;
  }

  // Start a new sleep session (no end time)
  async function startSleepSession(babyId: string, notes?: string) {
    if (!currentUser.value) throw new Error("User not authenticated");
    const { data, error } = await supabase
      .from("sleep_sessions")
      .insert({
        baby_id: babyId,
        start_time: new Date().toISOString(),
        end_time: null,
        notes: notes || null,
        user_id: currentUser.value.id,
      })
      .select()
      .single();
    if (error) throw error;
    sleepSessions.value.unshift(data);
    return data;
  }

  // End the current sleep session (set end_time to now)
  async function endSleepSession(babyId: string) {
    if (!currentUser.value) throw new Error("User not authenticated");
    const openSession = sleepSessions.value.find(
      (s) => s.baby_id === babyId && !s.end_time,
    );
    if (!openSession) throw new Error("No open sleep session found");
    const { data, error } = await supabase
      .from("sleep_sessions")
      .update({ end_time: new Date().toISOString() })
      .eq("id", openSession.id)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();
    if (error) throw error;
    const index = sleepSessions.value.findIndex((s) => s.id === openSession.id);
    if (index !== -1) sleepSessions.value[index] = data;
    return data;
  }

  // Check if a baby is currently sleeping (has an open session)
  function isBabySleeping(babyId: string) {
    return sleepSessions.value.some((s) => s.baby_id === babyId && !s.end_time);
  }

  // Add a new solid food
  async function addSolidFood(
    babyId: string,
    foodName: string,
    foodCategory: SolidFood["food_category"],
    notes?: string,
    reaction?: SolidFood["reaction"],
  ) {
    try {
      await ensureValidSession();

      // Check if this food already exists for this baby
      const existingFood = solidFoods.value.find(
        (f) =>
          f.baby_id === babyId &&
          f.food_name.toLowerCase() === foodName.toLowerCase(),
      );

      if (existingFood) {
        // Increment times_tried and update last_tried_date
        return await updateSolidFood(existingFood.id, {
          times_tried: existingFood.times_tried + 1,
          last_tried_date: new Date().toISOString(),
          notes: notes || existingFood.notes,
          reaction: reaction || existingFood.reaction,
        });
      }

      // Create new solid food entry
      const solidFoodData = {
        baby_id: babyId,
        user_id: currentUser.value!.id,
        food_name: foodName,
        food_category: foodCategory,
        times_tried: 1,
        first_tried_date: new Date().toISOString(),
        last_tried_date: new Date().toISOString(),
        notes: notes || null,
        reaction: reaction || null,
      };

      const { data, error } = await supabase
        .from("solid_foods")
        .insert(solidFoodData)
        .select()
        .single();

      if (error) {
        console.error("Error adding solid food:", error);
        throw error;
      }

      solidFoods.value.unshift(data);
      return data;
    } catch (error) {
      console.error("Error in addSolidFood:", error);
      throw error;
    }
  }

  // Update a solid food
  async function updateSolidFood(
    id: string,
    updates: Partial<{
      times_tried: number;
      notes: string | null;
      reaction: SolidFood["reaction"];
      last_tried_date: string;
    }>,
  ) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("solid_foods")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", currentUser.value.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating solid food:", error);
      throw error;
    }

    const index = solidFoods.value.findIndex((f) => f.id === id);
    if (index !== -1) {
      solidFoods.value[index] = data;
    }

    return data;
  }

  // Delete a solid food
  async function deleteSolidFood(id: string) {
    if (!currentUser.value) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("solid_foods")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.value.id);

    if (error) {
      console.error("Error deleting solid food:", error);
      throw error;
    }

    const index = solidFoods.value.findIndex((f) => f.id === id);
    if (index !== -1) {
      solidFoods.value.splice(index, 1);
    }

    return true;
  }

  // Get solid foods for a specific baby
  function getBabySolidFoods(babyId: string) {
    return solidFoods.value
      .filter((f) => f.baby_id === babyId)
      .sort(
        (a, b) =>
          new Date(b.first_tried_date).getTime() -
          new Date(a.first_tried_date).getTime(),
      );
  }

  // Get most tried solid foods for a baby
  function getMostTriedSolidFoods(babyId: string, limit: number = 5) {
    return solidFoods.value
      .filter((f) => f.baby_id === babyId)
      .sort((a, b) => b.times_tried - a.times_tried)
      .slice(0, limit);
  }

  // Get solid foods by reaction
  function getSolidFoodsByReaction(
    babyId: string,
    reaction: SolidFood["reaction"],
  ) {
    return solidFoods.value
      .filter((f) => f.baby_id === babyId && f.reaction === reaction)
      .sort((a, b) => b.times_tried - a.times_tried);
  }

  // Get solid foods by category
  function getSolidFoodsByCategory(
    babyId: string,
    category: SolidFood["food_category"],
  ) {
    return solidFoods.value
      .filter((f) => f.baby_id === babyId && f.food_category === category)
      .sort(
        (a, b) =>
          new Date(b.first_tried_date).getTime() -
          new Date(a.first_tried_date).getTime(),
      );
  }

  // Check if a food has been tried
  function hasFoodBeenTried(babyId: string, foodName: string): boolean {
    return solidFoods.value.some(
      (f) =>
        f.baby_id === babyId &&
        f.food_name.toLowerCase() === foodName.toLowerCase(),
    );
  }

  // Get times a food has been tried
  function getFoodTryCount(babyId: string, foodName: string): number {
    const food = solidFoods.value.find(
      (f) =>
        f.baby_id === babyId &&
        f.food_name.toLowerCase() === foodName.toLowerCase(),
    );
    return food ? food.times_tried : 0;
  }

  // Start polling when the store is initialized and user is signed in
  onMounted(() => {
    if (currentUser.value) startPolling();
  });

  // Stop polling when the store is disposed
  onUnmounted(() => {
    stopPolling();
    sessionPersistence.cleanup();
  });

  // Also start/stop polling on auth state changes
  watch(currentUser, (user) => {
    if (user) {
      startPolling();
    } else {
      stopPolling();
    }
  });



  return {
    // State
    babies,
    feedings,
    diaperChanges,
    sleepSessions,
    babySettings,
    solidFoods,
    isLoading,
    currentUser,

    // Actions
    initializeStore,
    addBaby,
    updateBaby,
    deleteBaby,
    addFeeding,
    addNursingSession,
    saveNursingSession,
    startNursingSession,
    endNursingSession,
    isBabyNursing,
    getActiveNursingSession,
    startActiveNursingSession,
    updateActiveNursingSession,
    endActiveNursingSession,
    cancelActiveNursingSession,
    getAllActiveNursingSessions,
    hasAnyActiveNursingSession,
    getSessionRecoveryData,
    updateNursingNotes,
    updateNursingSession,
    deleteNursingSession,
    getNursingSessions,
    getCompletedNursingSessions,
    getNursingAnalytics,
    getTodaysNursingSummary,
    getWeeklyNursingSummary,
    getBreastUsageBalance,
    validateNursingSession,
    validateDualTimerSession,
    formatNursingDuration,
    getNursingSessionDuration,
    addTopUpToFeeding,
    addDiaperChange,
    addSleepSession,
    updateFeeding,
    updateDiaperChange,
    updateSleepSession,
    deleteFeeding,
    deleteDiaperChange,
    deleteSleepSession,
    getBabyFeedings,
    getBabyDiaperChanges,
    getBabySleepSessions,

    // Solid Foods
    addSolidFood,
    updateSolidFood,
    deleteSolidFood,
    getBabySolidFoods,
    getMostTriedSolidFoods,
    getSolidFoodsByReaction,
    getSolidFoodsByCategory,
    hasFoodBeenTried,
    getFoodTryCount,

    // Auth
    signIn,
    signUp,
    signOut,
    getTodaysFeedingsTotal,
    loadData,
    getBabySettings,
    updateBabySettings,
    createBabySettings,
    startSleepSession,
    endSleepSession,
    isBabySleeping,
  };
});