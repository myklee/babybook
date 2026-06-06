import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ScheduleManager from "../ScheduleManager.vue";
import { useBabyStore } from "../../stores/babyStore";
import type { FeedingSchedule } from "../../types/feedingScheduleAutomation";

// Mock ScheduleForm component
vi.mock("../ScheduleForm.vue", () => ({
  default: {
    name: "ScheduleForm",
    template: '<div class="schedule-form-mock"></div>',
  },
}));

describe("ScheduleManager", () => {
  let store: ReturnType<typeof useBabyStore>;
  const babyId = "baby-123";
  const babyName = "Test Baby";

  const mockSchedules: FeedingSchedule[] = [
    {
      id: "schedule-1",
      baby_id: babyId,
      user_id: "user-123",
      name: "Morning Formula",
      feeding_type: "formula",
      default_amount: 120,
      is_active: true,
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      last_used_at: "2024-01-15T08:00:00Z",
      usage_count: 10,
    },
    {
      id: "schedule-2",
      baby_id: babyId,
      user_id: "user-123",
      name: "Evening Breast",
      feeding_type: "breast",
      is_active: false,
      created_at: "2024-01-02T20:00:00Z",
      updated_at: "2024-01-02T20:00:00Z",
      last_used_at: undefined,
      usage_count: 0,
    },
    {
      id: "schedule-3",
      baby_id: babyId,
      user_id: "user-123",
      name: "Lunch Solids",
      feeding_type: "solid",
      is_active: true,
      created_at: "2024-01-03T12:00:00Z",
      updated_at: "2024-01-03T12:00:00Z",
      last_used_at: "2024-01-14T12:00:00Z",
      usage_count: 5,
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useBabyStore();

    // Mock store methods
    vi.spyOn(store, "getBabyFeedingSchedules").mockReturnValue(mockSchedules);
    vi.spyOn(store, "updateFeedingSchedule").mockResolvedValue({} as any);
    vi.spyOn(store, "deleteFeedingSchedule").mockResolvedValue();
  });

  describe("Component Rendering", () => {
    it("should render the component with header", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      expect(wrapper.find(".schedule-manager").exists()).toBe(true);
      expect(wrapper.find(".manager-header").exists()).toBe(true);
      expect(wrapper.text()).toContain(`Feeding Schedules for ${babyName}`);
    });

    it("should display schedule count", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      expect(wrapper.text()).toContain("3 schedules");
      expect(wrapper.text()).toContain("(2 active)");
    });

    it("should show empty state when no schedules exist", () => {
      vi.spyOn(store, "getBabyFeedingSchedules").mockReturnValue([]);

      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      expect(wrapper.find(".empty-state").exists()).toBe(true);
      expect(wrapper.text()).toContain("No Schedules Yet");
    });
  });

  describe("Schedule List Display", () => {
    it("should display all schedules", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const scheduleItems = wrapper.findAll(".schedule-item");
      expect(scheduleItems).toHaveLength(3);
    });

    it("should display schedule details correctly", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      expect(firstSchedule.text()).toContain("Morning Formula");
      expect(firstSchedule.text()).toContain("Formula");
      expect(firstSchedule.text()).toContain("120ml");
      expect(firstSchedule.text()).toContain("Active");
      expect(firstSchedule.text()).toContain("10 times");
    });

    it("should mark inactive schedules", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const scheduleItems = wrapper.findAll(".schedule-item");
      const inactiveSchedule = scheduleItems[1];

      expect(inactiveSchedule.classes()).toContain("inactive");
      expect(inactiveSchedule.text()).toContain("Inactive");
    });

    it("should display usage statistics", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      expect(firstSchedule.text()).toContain("Used:");
      expect(firstSchedule.text()).toContain("Last used:");
    });
  });

  describe("Sorting Functionality", () => {
    it("should display sort controls", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      expect(wrapper.find(".sort-controls").exists()).toBe(true);
      expect(wrapper.text()).toContain("Sort by:");
    });

    it("should have sort buttons for name, last used, and usage", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const sortButtons = wrapper.findAll(".sort-button");
      expect(sortButtons).toHaveLength(3);
      expect(sortButtons[0].text()).toContain("Name");
      expect(sortButtons[1].text()).toContain("Last Used");
      expect(sortButtons[2].text()).toContain("Usage");
    });

    it("should toggle sort order when clicking the same sort button", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const nameButton = wrapper.findAll(".sort-button")[0];

      // First click - should be ascending
      await nameButton.trigger("click");
      expect(nameButton.classes()).toContain("active");

      // Second click - should toggle to descending
      await nameButton.trigger("click");
      expect(nameButton.classes()).toContain("active");
    });
  });

  describe("Schedule Actions", () => {
    it("should have action buttons for each schedule", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const actionButtons = firstSchedule.findAll(".btn-icon");

      expect(actionButtons).toHaveLength(3); // Toggle, Edit, Delete
    });

    it("should open create schedule form when clicking create button", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const createButton = wrapper.find(".btn-primary");
      await createButton.trigger("click");

      expect(wrapper.find(".schedule-form-mock").exists()).toBe(true);
    });

    it("should open edit schedule form when clicking edit button", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const editButton = firstSchedule.findAll(".btn-icon")[1];

      await editButton.trigger("click");

      expect(wrapper.find(".schedule-form-mock").exists()).toBe(true);
    });

    it("should toggle schedule active state", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const toggleButton = firstSchedule.findAll(".btn-icon")[0];

      await toggleButton.trigger("click");

      expect(store.updateFeedingSchedule).toHaveBeenCalledWith("schedule-1", {
        is_active: false,
      });
    });

    it("should show delete confirmation when clicking delete button", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const deleteButton = firstSchedule.findAll(".btn-icon")[2];

      await deleteButton.trigger("click");

      expect(wrapper.find(".confirmation-modal").exists()).toBe(true);
      expect(wrapper.text()).toContain("Delete Schedule?");
      expect(wrapper.text()).toContain("Morning Formula");
    });
  });

  describe("Delete Confirmation", () => {
    it("should display delete confirmation modal with schedule name", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const deleteButton = firstSchedule.findAll(".btn-icon")[2];
      await deleteButton.trigger("click");

      const modal = wrapper.find(".confirmation-modal");
      expect(modal.exists()).toBe(true);
      expect(modal.text()).toContain("Morning Formula");
      expect(modal.text()).toContain("This action cannot be undone");
    });

    it("should cancel delete when clicking cancel button", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const deleteButton = firstSchedule.findAll(".btn-icon")[2];
      await deleteButton.trigger("click");

      const cancelButton = wrapper.find(".btn-cancel");
      await cancelButton.trigger("click");

      expect(wrapper.find(".confirmation-modal").exists()).toBe(false);
    });

    it("should delete schedule when confirming", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const deleteButton = firstSchedule.findAll(".btn-icon")[2];
      await deleteButton.trigger("click");

      const confirmButton = wrapper.find(".btn-delete");
      await confirmButton.trigger("click");

      expect(store.deleteFeedingSchedule).toHaveBeenCalledWith("schedule-1");
    });

    it("should close modal after successful delete", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const deleteButton = firstSchedule.findAll(".btn-icon")[2];
      await deleteButton.trigger("click");

      const confirmButton = wrapper.find(".btn-delete");
      await confirmButton.trigger("click");

      await wrapper.vm.$nextTick();

      expect(wrapper.find(".confirmation-modal").exists()).toBe(false);
    });
  });

  describe("Schedule Form Integration", () => {
    it("should close form when emitting close event", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const createButton = wrapper.find(".btn-primary");
      await createButton.trigger("click");

      expect(wrapper.find(".schedule-form-mock").exists()).toBe(true);

      // Simulate form close
      const form = wrapper.findComponent({ name: "ScheduleForm" });
      await form.vm.$emit("close");

      expect(wrapper.find(".schedule-form-mock").exists()).toBe(false);
    });

    it("should close form when emitting saved event", async () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const createButton = wrapper.find(".btn-primary");
      await createButton.trigger("click");

      const form = wrapper.findComponent({ name: "ScheduleForm" });
      await form.vm.$emit("saved");

      expect(wrapper.find(".schedule-form-mock").exists()).toBe(false);
    });
  });

  describe("Accessibility", () => {
    it("should have proper button types", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const buttons = wrapper.findAll("button");
      buttons.forEach((button) => {
        expect(button.attributes("type")).toBe("button");
      });
    });

    it("should have title attributes on action buttons", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const actionButtons = firstSchedule.findAll(".btn-icon");

      actionButtons.forEach((button) => {
        expect(button.attributes("title")).toBeDefined();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle schedule with no last_used_at", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const secondSchedule = wrapper.findAll(".schedule-item")[1];
      expect(secondSchedule.text()).toContain("Never used");
    });

    it("should handle schedule without default amount", () => {
      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const secondSchedule = wrapper.findAll(".schedule-item")[1];
      expect(secondSchedule.text()).not.toContain("ml");
    });

    it("should handle error when toggling schedule fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      vi.spyOn(store, "updateFeedingSchedule").mockRejectedValue(
        new Error("Network error"),
      );

      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const toggleButton = firstSchedule.findAll(".btn-icon")[0];

      await toggleButton.trigger("click");
      await wrapper.vm.$nextTick();

      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to update schedule. Please try again.",
      );

      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it("should handle error when deleting schedule fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      vi.spyOn(store, "deleteFeedingSchedule").mockRejectedValue(
        new Error("Network error"),
      );

      const wrapper = mount(ScheduleManager, {
        props: { babyId, babyName },
      });

      const firstSchedule = wrapper.findAll(".schedule-item")[0];
      const deleteButton = firstSchedule.findAll(".btn-icon")[2];
      await deleteButton.trigger("click");

      const confirmButton = wrapper.find(".btn-delete");
      await confirmButton.trigger("click");
      await wrapper.vm.$nextTick();

      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to delete schedule. Please try again.",
      );

      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });
});
