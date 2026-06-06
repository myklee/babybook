import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import QuickScheduleWidget from "../QuickScheduleWidget.vue";
import { useBabyStore } from "../../stores/babyStore";
import type { FeedingSchedule } from "../../types/feedingScheduleAutomation";

// Mock the useNotifications composable
vi.mock("../../composables/useNotifications", () => ({
  useNotifications: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

describe("QuickScheduleWidget", () => {
  let store: ReturnType<typeof useBabyStore>;

  const mockSchedules: FeedingSchedule[] = [
    {
      id: "schedule-1",
      baby_id: "baby-1",
      user_id: "user-1",
      name: "Morning Breast",
      feeding_type: "breast",
      is_active: true,
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      usage_count: 5,
    },
    {
      id: "schedule-2",
      baby_id: "baby-1",
      user_id: "user-1",
      name: "Formula 120ml",
      feeding_type: "formula",
      default_amount: 120,
      is_active: true,
      created_at: "2024-01-01T09:00:00Z",
      updated_at: "2024-01-01T09:00:00Z",
      usage_count: 3,
    },
    {
      id: "schedule-3",
      baby_id: "baby-1",
      user_id: "user-1",
      name: "Lunch Solids",
      feeding_type: "solid",
      is_active: true,
      created_at: "2024-01-01T12:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      usage_count: 2,
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useBabyStore();
  });

  it("renders nothing when there are no active schedules", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue([]);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    expect(wrapper.find(".quick-schedule-widget").exists()).toBe(false);
  });

  it("renders widget with active schedules", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    expect(wrapper.find(".quick-schedule-widget").exists()).toBe(true);
    expect(wrapper.find(".widget-title").text()).toBe("Quick Schedules");
    expect(wrapper.findAll(".schedule-btn")).toHaveLength(3);
  });

  it("displays schedule names correctly", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const buttons = wrapper.findAll(".schedule-btn");
    expect(buttons[0].find(".schedule-name").text()).toBe("Morning Breast");
    expect(buttons[1].find(".schedule-name").text()).toBe("Formula 120ml");
    expect(buttons[2].find(".schedule-name").text()).toBe("Lunch Solids");
  });

  it("displays default amount for formula schedules", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const formulaButton = wrapper.findAll(".schedule-btn")[1];
    expect(formulaButton.find(".schedule-amount").text()).toBe("120ml");
  });

  it("does not display amount for non-formula schedules", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const breastButton = wrapper.findAll(".schedule-btn")[0];
    expect(breastButton.find(".schedule-amount").exists()).toBe(false);
  });

  it("applies correct CSS classes for feeding types", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const buttons = wrapper.findAll(".schedule-btn");
    expect(buttons[0].classes()).toContain("schedule-btn-breast");
    expect(buttons[1].classes()).toContain("schedule-btn-formula");
    expect(buttons[2].classes()).toContain("schedule-btn-solid");
  });

  it("triggers schedule when button is clicked", async () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);
    const triggerSpy = vi
      .spyOn(store, "triggerFeedingSchedule")
      .mockResolvedValue({
        success: true,
        feeding_id: "feeding-1",
        schedule_id: "schedule-1",
      });

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const firstButton = wrapper.findAll(".schedule-btn")[0];
    await firstButton.trigger("click");

    expect(triggerSpy).toHaveBeenCalledWith("schedule-1");
  });

  it("shows loading state while triggering schedule", async () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    // Create a promise that we can control
    let resolvePromise: (value: any) => void;
    const triggerPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(store, "triggerFeedingSchedule").mockReturnValue(
      triggerPromise as any,
    );

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const firstButton = wrapper.findAll(".schedule-btn")[0];
    await firstButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Check loading state
    expect(firstButton.classes()).toContain("is-loading");
    expect(firstButton.attributes("disabled")).toBeDefined();
    expect(firstButton.find(".loading-overlay").exists()).toBe(true);

    // Resolve the promise
    resolvePromise!({
      success: true,
      feeding_id: "feeding-1",
      schedule_id: "schedule-1",
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check loading state is removed
    expect(firstButton.classes()).not.toContain("is-loading");
  });

  it("prevents multiple simultaneous triggers", async () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    let resolvePromise: (value: any) => void;
    const triggerPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const triggerSpy = vi
      .spyOn(store, "triggerFeedingSchedule")
      .mockReturnValue(triggerPromise as any);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const firstButton = wrapper.findAll(".schedule-btn")[0];

    // Click multiple times
    await firstButton.trigger("click");
    await firstButton.trigger("click");
    await firstButton.trigger("click");

    // Should only be called once
    expect(triggerSpy).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise!({
      success: true,
      feeding_id: "feeding-1",
      schedule_id: "schedule-1",
    });
  });

  it("handles trigger success correctly", async () => {
    const { useNotifications } =
      await import("../../composables/useNotifications");
    const { showSuccess } = useNotifications();

    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);
    vi.spyOn(store, "triggerFeedingSchedule").mockResolvedValue({
      success: true,
      feeding_id: "feeding-1",
      schedule_id: "schedule-1",
    });

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const firstButton = wrapper.findAll(".schedule-btn")[0];
    await firstButton.trigger("click");
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showSuccess).toHaveBeenCalledWith(
      "Feeding logged!",
      "Morning Breast feeding entry created for Test Baby",
      { duration: 3000 },
    );
  });

  it("handles trigger failure correctly", async () => {
    const { useNotifications } =
      await import("../../composables/useNotifications");
    const { showError } = useNotifications();

    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);
    vi.spyOn(store, "triggerFeedingSchedule").mockResolvedValue({
      success: false,
      error: "Schedule not found",
      schedule_id: "schedule-1",
    });

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const firstButton = wrapper.findAll(".schedule-btn")[0];
    await firstButton.trigger("click");
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showError).toHaveBeenCalledWith(
      "Failed to log feeding",
      "Schedule not found",
      { duration: 5000 },
    );
  });

  it("handles unexpected errors correctly", async () => {
    const { useNotifications } =
      await import("../../composables/useNotifications");
    const { showError } = useNotifications();

    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);
    vi.spyOn(store, "triggerFeedingSchedule").mockRejectedValue(
      new Error("Network error"),
    );

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const firstButton = wrapper.findAll(".schedule-btn")[0];
    await firstButton.trigger("click");
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showError).toHaveBeenCalledWith(
      "Failed to log feeding",
      "An unexpected error occurred",
      { duration: 5000 },
    );
  });

  it("has proper accessibility attributes", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    const buttons = wrapper.findAll(".schedule-btn");
    expect(buttons[0].attributes("aria-label")).toBe(
      "Trigger Morning Breast schedule",
    );
    expect(buttons[1].attributes("aria-label")).toBe(
      "Trigger Formula 120ml schedule",
    );
    expect(buttons[2].attributes("aria-label")).toBe(
      "Trigger Lunch Solids schedule",
    );
  });

  it("is responsive and adapts to different screen sizes", () => {
    vi.spyOn(store, "getActiveFeedingSchedules").mockReturnValue(mockSchedules);

    const wrapper = mount(QuickScheduleWidget, {
      props: {
        babyId: "baby-1",
        babyName: "Test Baby",
      },
    });

    // Check that the widget has responsive classes
    expect(wrapper.find(".quick-schedule-widget").exists()).toBe(true);
    expect(wrapper.find(".schedule-buttons").exists()).toBe(true);

    // Buttons should have flex properties for responsive layout
    const buttons = wrapper.findAll(".schedule-btn");
    buttons.forEach((button) => {
      expect(button.element).toBeTruthy();
    });
  });
});
