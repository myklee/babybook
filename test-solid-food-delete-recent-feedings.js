// Test script to verify solid food delete functionality and recent feedings update
// This script simulates the delete operation and checks if recent feedings are updated

console.log("Testing solid food delete and recent feedings update...");

// Mock data structures similar to the store
let mockFeedings = [
  {
    id: "feeding-1",
    type: "solid",
    timestamp: "2024-01-15T10:00:00Z",
    baby_id: "baby-1",
    user_id: "user-1",
  },
  {
    id: "feeding-2",
    type: "breast",
    timestamp: "2024-01-15T09:00:00Z",
    baby_id: "baby-1",
    user_id: "user-1",
    amount: 120,
  },
];

let mockSolidFoodEvents = [
  {
    id: "event-1",
    feeding_id: "feeding-1",
    timestamp: "2024-01-15T10:00:00Z",
    baby_id: "baby-1",
    foods: [{ id: "food-1", name: "Apple", times_consumed: 3 }],
  },
];

let mockSolidFoods = [
  {
    id: "legacy-1",
    food_name: "Banana",
    last_tried_date: "2024-01-15T08:00:00Z",
    baby_id: "baby-1",
    times_tried: 2,
  },
];

// Function to simulate the combinedFeedings computed property
function getCombinedFeedings(babyId) {
  const regularFeedings = mockFeedings
    .filter((f) => f.baby_id === babyId && f.type !== "solid")
    .map((f) => ({
      ...f,
      event_type: "feeding",
      sort_time: new Date(f.timestamp).getTime(),
    }));

  const newSolidFeedingEvents = mockSolidFoodEvents
    .filter((sf) => sf.baby_id === babyId)
    .map((sf) => ({
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

// Function to simulate the delete operation
function deleteSolidFoodEvent(feedingId) {
  console.log(`Deleting solid food event with feeding ID: ${feedingId}`);

  // Find the feeding to delete
  const feedingIndex = mockFeedings.findIndex((f) => f.id === feedingId);
  if (feedingIndex === -1) {
    console.log("Feeding not found");
    return false;
  }

  // Remove from feedings array
  const deletedFeeding = mockFeedings.splice(feedingIndex, 1)[0];
  console.log("Removed feeding:", deletedFeeding);

  // Remove from solid food events array
  const eventIndex = mockSolidFoodEvents.findIndex(
    (e) => e.feeding_id === feedingId
  );
  if (eventIndex !== -1) {
    const deletedEvent = mockSolidFoodEvents.splice(eventIndex, 1)[0];
    console.log("Removed solid food event:", deletedEvent);
  }

  return true;
}

// Test the functionality
console.log("\n=== BEFORE DELETE ===");
console.log("Feedings:", mockFeedings.length);
console.log("Solid Food Events:", mockSolidFoodEvents.length);
console.log("Legacy Solid Foods:", mockSolidFoods.length);

const combinedBefore = getCombinedFeedings("baby-1");
console.log("Combined feedings for baby-1:", combinedBefore.length);
combinedBefore.forEach((item, index) => {
  console.log(
    `  ${index + 1}. ${item.event_type} - ${
      item.timestamp || item.last_tried_date
    } - ${item.type || "solid"}`
  );
});

// Delete the solid food event
console.log("\n=== DELETING SOLID FOOD EVENT ===");
const deleteResult = deleteSolidFoodEvent("feeding-1");
console.log("Delete result:", deleteResult);

console.log("\n=== AFTER DELETE ===");
console.log("Feedings:", mockFeedings.length);
console.log("Solid Food Events:", mockSolidFoodEvents.length);
console.log("Legacy Solid Foods:", mockSolidFoods.length);

const combinedAfter = getCombinedFeedings("baby-1");
console.log("Combined feedings for baby-1:", combinedAfter.length);
combinedAfter.forEach((item, index) => {
  console.log(
    `  ${index + 1}. ${item.event_type} - ${
      item.timestamp || item.last_tried_date
    } - ${item.type || "solid"}`
  );
});

console.log("\n=== ANALYSIS ===");
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
}
