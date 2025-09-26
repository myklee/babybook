// Debug script to test solid food delete in the actual application
// This script can be run in the browser console to debug the issue

console.log("=== DEBUGGING SOLID FOOD DELETE ISSUE ===");

// Function to check the current state
function checkStoreState() {
  // Access the store from the global Vue app instance
  const app = document.querySelector("#app").__vue_app__;
  const store = app.config.globalProperties.$pinia._s.get("baby");

  if (!store) {
    console.log("❌ Could not access baby store");
    return null;
  }

  console.log("Store state:");
  console.log(`- Feedings: ${store.feedings.length}`);
  console.log(`- Solid Food Events: ${store.solidFoodEvents.length}`);
  console.log(`- User Food Items: ${store.userFoodItems.length}`);
  console.log(`- Legacy Solid Foods: ${store.solidFoods.length}`);

  // Check for solid food feedings
  const solidFeedings = store.feedings.filter((f) => f.type === "solid");
  console.log(`- Solid feedings: ${solidFeedings.length}`);
  solidFeedings.forEach((f) => {
    console.log(`  - ${f.id}: ${f.timestamp}`);
  });

  return store;
}

// Function to simulate the getBabySolidFoodEvents method
function testGetBabySolidFoodEvents(store, babyId) {
  console.log(`\nTesting getBabySolidFoodEvents for baby: ${babyId}`);

  const solidFeedings = store.feedings.filter(
    (f) => f.baby_id === babyId && f.type === "solid"
  );
  console.log(`Found ${solidFeedings.length} solid feedings`);

  const result = solidFeedings.map((feeding) => {
    const feedingSolidFoodEvents = store.solidFoodEvents.filter(
      (e) => e.feeding_id === feeding.id
    );
    const foods = feedingSolidFoodEvents
      .map((event) =>
        store.userFoodItems.find((item) => item.id === event.food_item_id)
      )
      .filter(Boolean);

    console.log(
      `  Feeding ${feeding.id} has ${foods.length} foods: ${foods
        .map((f) => f.name)
        .join(", ")}`
    );

    return {
      ...feeding,
      foods,
    };
  });

  return result;
}

// Function to test the combined feedings logic
function testCombinedFeedings(store, babyId) {
  console.log(`\nTesting combined feedings for baby: ${babyId}`);

  const regularFeedings = store.feedings
    .filter((f) => f.baby_id === babyId && f.type !== "solid")
    .map((f) => ({
      ...f,
      event_type: "feeding",
      sort_time: new Date(f.timestamp).getTime(),
    }));

  const solidFoodEvents = testGetBabySolidFoodEvents(store, babyId);
  const newSolidFeedingEvents = solidFoodEvents.map((sf) => ({
    ...sf,
    event_type: "solid",
    sort_time: new Date(sf.timestamp).getTime(),
  }));

  const legacySolidFeedingEvents = store.solidFoods
    .filter((sf) => sf.baby_id === babyId)
    .map((sf) => ({
      ...sf,
      id: sf.id,
      event_type: "solid_legacy",
      timestamp: sf.last_tried_date,
      type: "solid",
      sort_time: new Date(sf.last_tried_date).getTime(),
      food_name: sf.food_name,
      foods: undefined,
    }));

  const combined = [
    ...regularFeedings,
    ...newSolidFeedingEvents,
    ...legacySolidFeedingEvents,
  ];
  const sorted = combined.sort((a, b) => b.sort_time - a.sort_time);

  console.log(`Combined feedings: ${sorted.length}`);
  sorted.forEach((item, index) => {
    const foodInfo = item.foods
      ? `(${item.foods.map((f) => f.name).join(", ")})`
      : item.food_name
      ? `(${item.food_name})`
      : "";
    console.log(
      `  ${index + 1}. ${item.event_type} - ${item.id} - ${new Date(
        item.timestamp || item.last_tried_date
      ).toLocaleString()} ${foodInfo}`
    );
  });

  return sorted;
}

// Main debug function
function debugSolidFoodDelete() {
  console.log("Step 1: Check initial store state");
  const store = checkStoreState();

  if (!store) return;

  // Get the first baby ID
  const babyId = store.babies[0]?.id;
  if (!babyId) {
    console.log("❌ No babies found");
    return;
  }

  console.log(`\nStep 2: Test combined feedings for baby: ${babyId}`);
  const combinedBefore = testCombinedFeedings(store, babyId);

  // Find a solid food event to delete
  const solidFoodEvent = combinedBefore.find(
    (item) => item.event_type === "solid"
  );
  if (!solidFoodEvent) {
    console.log("❌ No solid food events found to delete");
    return;
  }

  console.log(`\nStep 3: Found solid food event to test: ${solidFoodEvent.id}`);
  console.log("You can now manually delete this event and run the check again");

  // Store the test function globally for manual testing
  window.checkAfterDelete = function () {
    console.log("\n=== CHECKING STATE AFTER DELETE ===");
    const storeAfter = checkStoreState();
    if (storeAfter) {
      const combinedAfter = testCombinedFeedings(storeAfter, babyId);

      console.log("\n=== COMPARISON ===");
      console.log(`Before delete: ${combinedBefore.length} items`);
      console.log(`After delete: ${combinedAfter.length} items`);
      console.log(
        `Difference: ${combinedBefore.length - combinedAfter.length} items`
      );

      if (combinedBefore.length - combinedAfter.length === 1) {
        console.log("✅ SUCCESS: Item was properly removed");
      } else {
        console.log("❌ ISSUE: Item count mismatch");
      }
    }
  };

  console.log(
    "\nTo test: Delete a solid food event, then run window.checkAfterDelete() in the console"
  );
}

// Run the debug function
debugSolidFoodDelete();
