import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ScheduleTriggerButton from "../ScheduleTriggerButton.vue";
import type { FeedingSchedule } from "../../types/feedingScheduleAutomation";

describe("ScheduleTriggerButton", () => {
  let mockSchedule: FeedingSchedule;

  beforeEach(() => {
    mockSchedule = {
      id: "schedule-1",
      baby_id: "baby-1",
      user_id: "user-1",
      name: "Morning Formula",
      feeding_type: "formula",
      default_amount: 120,
      is_active: true,
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      usage_count: 5,
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Rendering", () => {
    it("renders schedule name", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      expect(wrapper.text()).toContain("Morning Formula");
    });

    it("renders amount for formula schedules", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      expect(wrapper.text()).toContain("120ml");
    });

    it("does not render amount when showAmount is false", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, showAmount: false },
      });

      expect(wrapper.text()).not.toContain("120ml");
    });

    it("does not render amount for breast feeding schedules", () => {
      const breastSchedule = {
        ...mockSchedule,
        feeding_type: "breast" as const,
        default_amount: undefined,
      };
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: breastSchedule },
      });

      expect(wrapper.text()).not.toContain("ml");
    });

    it("applies correct feeding type class", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      expect(wrapper.find(".schedule-trigger-btn").classes()).toContain(
        "schedule-trigger-btn-formula",
      );
    });

    it("applies compact class when compact prop is true", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, compact: true },
      });

      expect(wrapper.find(".schedule-trigger-btn").classes()).toContain(
        "is-compact",
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      const button = wrapper.find("button");
      expect(button.attributes("aria-label")).toBe(
        "Trigger Morning Formula feeding schedule",
      );
    });

    it("sets aria-busy when loading", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, isLoading: true },
      });

      const button = wrapper.find("button");
      expect(button.attributes("aria-busy")).toBe("true");
    });

    it("sets aria-live when showing feedback", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      // Show success feedback
      await wrapper.vm.showSuccess();
      await wrapper.vm.$nextTick();

      const button = wrapper.find("button");
      expect(button.attributes("aria-live")).toBe("polite");
    });

    it("has role status on spinner", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, isLoading: true },
      });

      const spinner = wrapper.find(".spinner");
      expect(spinner.attributes("role")).toBe("status");
      expect(spinner.attributes("aria-label")).toBe("Creating feeding entry");
    });
  });

  describe("Loading State", () => {
    it("shows loading overlay when isLoading is true", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, isLoading: true },
      });

      expect(wrapper.find(".loading-overlay").exists()).toBe(true);
      expect(wrapper.find(".spinner").exists()).toBe(true);
    });

    it("applies is-loading class when loading", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, isLoading: true },
      });

      expect(wrapper.find(".schedule-trigger-btn").classes()).toContain(
        "is-loading",
      );
    });

    it("disables button when loading", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, isLoading: true },
      });

      expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    });

    it("shows spinning icon when loading", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, isLoading: true },
      });

      expect(wrapper.find(".schedule-trigger-icon").classes()).toContain(
        "icon-spinning",
      );
    });
  });

  describe("User Interaction", () => {
    it("emits trigger event when clicked", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("trigger")).toBeTruthy();
      expect(wrapper.emitted("trigger")?.[0]).toEqual([mockSchedule]);
    });

    it("does not emit trigger when loading", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule, isLoading: true },
      });

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("trigger")).toBeFalsy();
    });

    it("does not emit trigger when showing feedback", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      // Show success feedback
      await wrapper.vm.showSuccess();
      await wrapper.vm.$nextTick();

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("trigger")).toBeFalsy();
    });
  });

  describe("Success Feedback", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows success overlay when showSuccess is called", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      await wrapper.vm.showSuccess();
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".feedback-success").exists()).toBe(true);
      expect(wrapper.find(".schedule-trigger-btn").classes()).toContain(
        "is-success",
      );
    });

    it("hides success feedback after 2 seconds", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      await wrapper.vm.showSuccess();
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".feedback-success").exists()).toBe(true);

      vi.advanceTimersByTime(2000);
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".feedback-success").exists()).toBe(false);
    });

    it("shows success icon", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      await wrapper.vm.showSuccess();
      await wrapper.vm.$nextTick();

      const icon = wrapper.find(".feedback-success .feedback-icon");
      expect(icon.exists()).toBe(true);
    });
  });

  describe("Error Feedback", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows error overlay when showError is called", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      await wrapper.vm.showError();
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".feedback-error").exists()).toBe(true);
      expect(wrapper.find(".schedule-trigger-btn").classes()).toContain(
        "is-error",
      );
    });

    it("hides error feedback after 3 seconds", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      await wrapper.vm.showError();
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".feedback-error").exists()).toBe(true);

      vi.advanceTimersByTime(3000);
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".feedback-error").exists()).toBe(false);
    });

    it("shows error icon", async () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      await wrapper.vm.showError();
      await wrapper.vm.$nextTick();

      const icon = wrapper.find(".feedback-error .feedback-icon");
      expect(icon.exists()).toBe(true);
    });
  });

  describe("Feeding Type Icons", () => {
    it("shows breast icon for breast feeding", () => {
      const breastSchedule = {
        ...mockSchedule,
        feeding_type: "breast" as const,
      };
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: breastSchedule },
      });

      const icon = wrapper.find(".schedule-trigger-icon");
      expect(icon.attributes("alt")).toBe("breast feeding");
    });

    it("shows formula icon for formula feeding", () => {
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      const icon = wrapper.find(".schedule-trigger-icon");
      expect(icon.attributes("alt")).toBe("formula feeding");
    });

    it("shows solid icon for solid feeding", () => {
      const solidSchedule = {
        ...mockSchedule,
        feeding_type: "solid" as const,
        default_amount: undefined,
      };
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: solidSchedule },
      });

      const icon = wrapper.find(".schedule-trigger-icon");
      expect(icon.attributes("alt")).toBe("solid feeding");
    });
  });

  describe("Edge Cases", () => {
    it("handles schedule without default amount", () => {
      const scheduleWithoutAmount = {
        ...mockSchedule,
        default_amount: undefined,
      };
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: scheduleWithoutAmount },
      });

      expect(wrapper.text()).not.toContain("ml");
    });

    it("handles very long schedule names", () => {
      const longNameSchedule = {
        ...mockSchedule,
        name: "Very Long Schedule Name That Should Still Display Properly",
      };
      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: longNameSchedule },
      });

      expect(wrapper.text()).toContain(
        "Very Long Schedule Name That Should Still Display Properly",
      );
    });

    it("clears previous feedback timer when showing new feedback", async () => {
      vi.useFakeTimers();

      const wrapper = mount(ScheduleTriggerButton, {
        props: { schedule: mockSchedule },
      });

      // Show success
      await wrapper.vm.showSuccess();
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".feedback-success").exists()).toBe(true);

      // Show error before success timer completes
      await wrapper.vm.showError();
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".feedback-success").exists()).toBe(false);
      expect(wrapper.find(".feedback-error").exists()).toBe(true);

      vi.useRealTimers();
    });
  });
});
