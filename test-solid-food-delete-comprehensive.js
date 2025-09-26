// Comprehensive test to debug the solid food delete issue
// This simulates the exact flow from the UI to the store

console.log("=== COMPREHENSIVE SOLID FOOD DELETE TEST ===\n");

// Mock the exact data structures from the store
let mockFeedings = [
  {
    id: "feeding-solid-1",
    type: "solid",
    timestamp: "2024-01-15T10:00:00Z",
    baby_id: "baby-1",
    user_id: "user-1",
    notes: "First solid food",
  },
  {
    id: "feeding-breast-1",
    type: "breast",
    timestamp: "2024-01-15T09:00:00Z",
    baby_id: "baby-1",
    user_id: "user-1",
    amount: 120,
  },
  {
    id: "feeding-solid-2",
    type: "solid",
    timestamp: "2024-01-15T08:30:00Z",
    baby_id: "baby-1",
    user_id: "user-1",
    notes: "Second solid food",
  },
];

let mockSolidFoodEvents = [
  {
    id: "event-1",
    feeding_id: "feeding-solid-1",
    food_item_id: "food-1",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "event-2",
    feeding_id: "feeding-solid-2",
    food_item_id: "food-2",
    created_at: "2024-01-15T08:30:00Z",
  },
];

let mockUserFoodItems = [
  {
    id: "food-1",
    name: "Apple",
    times_consumed: 3,
    user_id: "user-1",
  },
  {
    id: "food-2",
    name: "Banana",
    times_consumed: 2,
    user_id: "user-1",
  },
];

let mockSolidFoods = [
  {
    id: "legacy-1",
    food_name: "Carrot",
    last_tried_date: "2024-01-15T07:00:00Z",
    baby_id: "baby-1",
    times_tried: 1,
  },
];

// Simulate the getBabySolidFoodEvents method
function getBabySolidFoodEvents(babyId) {
  console.log(`Getting solid food events for baby: ${babyId}`);

  // Get solid food feeding events for this baby
  const solidFeedings = mockFeedings.filter(
    (f) => f.baby_id === babyId && f.type === "solid"
  );
  console.log(
    `Found ${solidFeedings.length} solid feedings:`,
    solidFeedings.map((f) => f.id)
  );

  // For each solid feeding, get the associated food items
  return solidFeedings.map((feeding) => {
    // Get solid food events for this feeding
    const feedingSolidFoodEvents = mockSolidFoodEvents.filter(
      (e) => e.feeding_id === feeding.id
    );
    console.log(
      `  Feeding ${feeding.id} has ${feedingSolidFoodEvents.length} events`
    );

    // Get the food items for these events
    const foods = feedingSolidFoodEvents
      .map((event) =>
        mockUserFoodItems.find((item) => item.id === event.food_item_id)
      )
      .filter(Boolean);
    console.log(
      `  Foods for feeding ${feeding.id}:`,
      foods.map((f) => f?.name)
    );

    return {
      ...feeding,
      foods,
    };
  });
}

// Simulate the combinedFeedings computed property from HistoryList
function getCombinedFeedings(babyId) {
  const regularFeedings = mockFeedings
    .filter((f) => f.baby_id === babyId && f.type !== "solid")
    .map((f) => ({
      ...f,
      event_type: "feeding",
      sort_time: new Date(f.timestamp).getTime(),
    }));

  const newSolidFeedingEvents = getBabySolidFoodEvents(babyId).map((sf) => ({
    ...sf,
    event_type: "solid",
    sort_time: new Date(sf.timestamp).getTime(),
  }));

  const legacySolidFeedingEvents = mockSolidFoods
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
  return combined.sort((a, b) => b.sort_time - a.sort_time);
}

// Simulate the deleteSolidFoodEvent method
function deleteSolidFoodEvent(feedingId) {
  console.log(`\n--- DELETING SOLID FOOD EVENT: ${feedingId} ---`);

  // Get the existing feeding record
  const existingFeeding = mockFeedings.find((f) => f.id === feedingId);
  if (!existingFeeding || existingFeeding.type !== "solid") {
    console.log("❌ Solid food event not found or not a solid type");
    return false;
  }
  console.log("✓ Found feeding to delete:", existingFeeding);

  // Get all solid food events for this feeding
  const solidFoodEventsToDelete = mockSolidFoodEvents.filter(
    (e) => e.feeding_id === feedingId
  );
  console.log(
    `✓ Found ${solidFoodEventsToDelete.length} solid food events to delete`
  );

  // Update local state - remove feeding
  const feedingIndex = mockFeedings.findIndex((f) => f.id === feedingId);
  if (feedingIndex !== -1) {
    const removed = mockFeedings.splice(feedingIndex, 1)[0];
    console.log("✓ Removed feeding from local state:", removed.id);
  }

  // Update local state - remove solid food events
  const originalEventsLength = mockSolidFoodEvents.length;
  mockSolidFoodEvents = mockSolidFoodEvents.filter(
    (e) => e.feeding_id !== feedingId
  );
  console.log(
    `✓ Removed ${
      originalEventsLength - mockSolidFoodEvents.length
    } solid food events from local state`
  );

  // Update local user food items state - decrement consumption counts
  if (solidFoodEventsToDelete.length > 0) {
    const foodItemIds = solidFoodEventsToDelete.map((e) => e.food_item_id);
    mockUserFoodItems = mockUserFoodItems.map((item) => {
      if (foodItemIds.includes(item.id)) {
        console.log(
          `✓ Decrementing consumption count for ${item.name}: ${
            item.times_consumed
          } -> ${Math.max(0, item.times_consumed - 1)}`
        );
        return {
          ...item,
          times_consumed: Math.max(0, item.times_consumed - 1),
          updated_at: new Date().toISOString(),
        };
      }
      return item;
    });
  }

  console.log("✓ Delete operation completed successfully");
  return true;
}

// Run the test
console.log("INITIAL STATE:");
console.log(`Feedings: ${mockFeedings.length}`);
console.log(`Solid Food Events: ${mockSolidFoodEvents.length}`);
console.log(`User Food Items: ${mockUserFoodItems.length}`);
console.log(`Legacy Solid Foods: ${mockSolidFoods.length}`);

console.log("\nGETTING COMBINED FEEDINGS BEFORE DELETE:");
const combinedBefore = getCombinedFeedings("baby-1");
console.log(`\nCombined feedings count: ${combinedBefore.length}`);
combinedBefore.forEach((item, index) => {
  const foodInfo = item.foods
    ? `(${item.foods.map((f) => f.name).join(", ")})`
    : item.food_name
    ? `(${item.food_name})`
    : "";
  console.log(
    `  ${index + 1}. ${item.event_type} - ${item.id} - ${
      item.timestamp || item.last_tried_date
    } ${foodInfo}`
  );
});

// Delete the first solid food event
const feedingToDelete = "feeding-solid-1";
console.log(`\nDELETING FEEDING: ${feedingToDelete}`);
const deleteResult = deleteSolidFoodEvent(feedingToDelete);

console.log("\nSTATE AFTER DELETE:");
console.log(`Feedings: ${mockFeedings.length}`);
console.log(`Solid Food Events: ${mockSolidFoodEvents.length}`);
console.log(`User Food Items: ${mockUserFoodItems.length}`);
console.log(`Legacy Solid Foods: ${mockSolidFoods.length}`);

console.log("\nGETTING COMBINED FEEDINGS AFTER DELETE:");
const combinedAfter = getCombinedFeedings("baby-1");
console.log(`\nCombined feedings count: ${combinedAfter.length}`);
combinedAfter.forEach((item, index) => {
  const foodInfo = item.foods
    ? `(${item.foods.map((f) => f.name).join(", ")})`
    : item.food_name
    ? `(${item.food_name})`
    : "";
  console.log(
    `  ${index + 1}. ${item.event_type} - ${item.id} - ${
      item.timestamp || item.last_tried_date
    } ${foodInfo}`
  );
});

console.log("\n=== FINAL ANALYSIS ===");
console.log(`Before delete: ${combinedBefore.length} items`);
console.log(`After delete: ${combinedAfter.length} items`);
console.log(
  `Difference: ${combinedBefore.length - combinedAfter.length} items removed`
);

if (combinedBefore.length - combinedAfter.length === 1) {
  console.log(
    "✅ SUCCESS: Solid food event was properly removed from recent feedings"
  );
} else {
  console.log(
    "❌ ISSUE: Solid food event was not properly removed from recent feedings"
  );

  // Check if the deleted item is still in the list
  const deletedItemStillExists = combinedAfter.some(
    (item) =>
      (item.event_type === "solid" && item.id === feedingToDelete) ||
      (item.event_type === "feeding" && item.id === feedingToDelete)
  );

  if (deletedItemStillExists) {
    console.log(
      "❌ The deleted item is still present in the combined feedings list"
    );
  } else {
    console.log("✓ The deleted item is not in the combined feedings list");
    console.log("❌ But the count difference suggests another issue");
  }
}
