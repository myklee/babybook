import { defineStore } from "pinia";
import { ref, onMounted, onUnmounted, watch } from "vue";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/supabase";
import { startOfToday, set } from "date-fns";

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

  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  function startPolling() {
    if (pollingInterval) return; // Already polling
    pollingInterval = setInterval(() => {
      if (currentUser.value) {
        loadData();
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
      await loadUser();
      if (currentUser.value) {
        console.log("User authenticated, loading data...");
        await loadData();
      } else {
        console.log("No user found, clearing data...");
        babies.value = [];
        feedings.value = [];
        diaperChanges.value = [];
        sleepSessions.value = [];
        solidFoods.value = [];
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
          } else if (event === "SIGNED_OUT") {
            babies.value = [];
            feedings.value = [];
            diaperChanges.value = [];
            sleepSessions.value = [];
            solidFoods.value = [];
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
          setTimeout(() => reject(new Error("Babies loading timeout")), 5000),
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
              5000,
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
        console.error("Baby settings table error:", settingsTableError);
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
          setTimeout(() => reject(new Error("Feedings loading timeout")), 5000),
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
            5000,
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
              5000,
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
              5000,
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
    } catch (error) {
      console.error("Error loading data:", error);
      // Don't clear existing data on error, just log it
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

  // Add top-up to an existing breast feeding
  async function addTopUpToFeeding(feedingId: string, topupAmount: number) {
    if (!currentUser.value) throw new Error("User not authenticated");

    // First, get the current feeding to verify it's a breast feeding
    const currentFeeding = feedings.value.find((f) => f.id === feedingId);
    if (!currentFeeding) throw new Error("Feeding not found");
    if (currentFeeding.type !== "breast")
      throw new Error("Can only add top-up to breast feedings");

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

      // Clear any stored session data
      try {
        localStorage.removeItem("babybook-auth");
        sessionStorage.removeItem("babybook-auth");
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
