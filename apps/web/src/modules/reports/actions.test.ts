import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isFaultInjected: vi.fn(),
  getTrendReport: vi.fn(),
}));

vi.mock("~/lib/session", async () => {
  class UnauthorizedError extends Error {
    readonly code = "UNAUTHORIZED" as const;
  }
  return { requireUser: mocks.requireUser, UnauthorizedError };
});
vi.mock("~/lib/fault-injection", () => ({
  isFaultInjected: mocks.isFaultInjected,
}));
vi.mock("./queries", () => ({ getTrendReport: mocks.getTrendReport }));

const { loadTrendReport } = await import("./actions");
const { UnauthorizedError } = await import("~/lib/session");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isFaultInjected.mockResolvedValue(false);
});

describe("loadTrendReport", () => {
  it("memuat tren milik user session", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-budi" });
    mocks.getTrendReport.mockResolvedValue({ months: [] });

    const result = await loadTrendReport();

    expect(mocks.getTrendReport).toHaveBeenCalledWith(
      "user-budi",
      expect.stringMatching(/^\d{4}-\d{2}$/),
    );
    expect(result).toEqual({ success: true, data: { months: [] } });
  });

  it("tanpa session → UNAUTHORIZED, query tidak dijalankan", async () => {
    mocks.requireUser.mockRejectedValue(new UnauthorizedError("Sesi berakhir"));

    const result = await loadTrendReport();

    expect(result).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.getTrendReport).not.toHaveBeenCalled();
  });

  it("query gagal → INTERNAL_ERROR dengan pesan tren", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-budi" });
    mocks.getTrendReport.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await loadTrendReport();

    expect(result).toEqual({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Gagal memuat tren. Coba lagi.",
      },
    });
  });
});
