const clerkMiddlewareMock = jest.fn((handler: unknown) => handler);
const createRouteMatcherMock = jest.fn((patterns: string[]) => {
  return (req: { nextUrl?: { pathname?: string }; url?: string }) => {
    const pathname =
      req.nextUrl?.pathname ?? (req.url ? new URL(req.url, "http://localhost").pathname : "");

    return patterns.some((pattern) => {
      const regex = new RegExp(`^${pattern.replace(/\(\.\*\)/g, ".*")}$`);
      return regex.test(pathname);
    });
  };
});

jest.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: clerkMiddlewareMock,
  createRouteMatcher: createRouteMatcherMock,
}));

describe("proxy", () => {
  beforeEach(() => {
    jest.resetModules();
    clerkMiddlewareMock.mockClear();
    createRouteMatcherMock.mockClear();
  });

  it("protects the demo page behind Clerk auth", async () => {
    const { default: proxy } = await import("@/proxy");
    const protect = jest.fn();

    await proxy({ protect }, { nextUrl: { pathname: "/demo" } });

    expect(protect).toHaveBeenCalledTimes(1);
  });

  it("still protects authenticated workspace routes", async () => {
    const { default: proxy } = await import("@/proxy");
    const protect = jest.fn();

    await proxy({ protect }, { nextUrl: { pathname: "/dashboard/trainer" } });

    expect(protect).toHaveBeenCalledTimes(1);
  });
});
