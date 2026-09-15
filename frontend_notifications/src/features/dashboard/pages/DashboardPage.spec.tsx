import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { dashboardQueryMock, notificationsQueryMock } = vi.hoisted(() => ({
  dashboardQueryMock: vi.fn(() => ({
    data: {
      summary: {
        total: 2,
        delivered: 1,
        pending: 0,
        failed: 1,
      },
      recent: [
        {
          id: "email-notification",
          channel: "EMAIL" as const,
          title: "Email notification",
          content: "Email content",
          recipient: "user@example.com",
          status: "DELIVERED" as const,
          lastError: null,
          sentAt: new Date("2026-09-14T10:00:00.000Z"),
          deliveredAt: new Date("2026-09-14T10:01:00.000Z"),
          createdAt: new Date("2026-09-14T09:59:00.000Z"),
          updatedAt: new Date("2026-09-14T10:01:00.000Z"),
        },
        {
          id: "sms-notification",
          channel: "SMS" as const,
          title: "SMS notification",
          content: "SMS content",
          recipient: "+525500000000",
          status: "FAILED" as const,
          lastError: "Provider error",
          sentAt: new Date("2026-09-14T09:00:00.000Z"),
          deliveredAt: null,
          createdAt: new Date("2026-09-14T08:59:00.000Z"),
          updatedAt: new Date("2026-09-14T09:01:00.000Z"),
        },
      ],
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })),

  notificationsQueryMock: vi.fn(() => ({
    data: {
      items: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock("../../notifications/hooks/notification.queries", () => ({
  useNotificationsDashboard: dashboardQueryMock,
  useNotifications: notificationsQueryMock,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en-US",
    },
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  it("uses the dashboard query instead of notification list queries", () => {
    render(<DashboardPage />);

    expect(dashboardQueryMock).toHaveBeenCalledTimes(1);
    expect(notificationsQueryMock).not.toHaveBeenCalled();
  });

  it("filters recent notifications locally by channel", async () => {
    const user = userEvent.setup();

    render(<DashboardPage />);

    expect(screen.getAllByText("Email notification").length).toBeGreaterThan(0);

    expect(screen.getAllByText("SMS notification").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("tab", {
        name: "channels.SMS",
      }),
    );

    expect(screen.queryByText("Email notification")).not.toBeInTheDocument();

    expect(screen.getAllByText("SMS notification").length).toBeGreaterThan(0);

    expect(notificationsQueryMock).not.toHaveBeenCalled();
  });
});
