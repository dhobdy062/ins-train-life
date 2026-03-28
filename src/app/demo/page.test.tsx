import { renderToStaticMarkup } from "react-dom/server";
import DemoPage from "@/app/demo/page";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDemoProspectByUserAndOrg } from "@/lib/convex";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/lib/convex", () => ({
  getDemoProspectByUserAndOrg: jest.fn(),
}));

jest.mock("@/components/PublicDemoConsole", () => ({
  __esModule: true,
  default: ({ organizationName }: { organizationName?: string }) => (
    <div data-testid="authenticated-demo-console">{organizationName}</div>
  ),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedGetDemoProspectByUserAndOrg = getDemoProspectByUserAndOrg as jest.MockedFunction<
  typeof getDemoProspectByUserAndOrg
>;

describe("DemoPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({
      userId: "user_123",
      orgId: "org_123",
    } as never);
    mockedGetDemoProspectByUserAndOrg.mockResolvedValue({
      organizationName: "North Ridge Agency",
    } as never);
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    mockedAuth.mockResolvedValue({
      userId: null,
      orgId: null,
    } as never);

    await expect(DemoPage()).rejects.toThrow("REDIRECT:/sign-in?redirect_url=%2Fdemo");
    expect(mockedRedirect).toHaveBeenCalledWith("/sign-in?redirect_url=%2Fdemo");
  });

  it("redirects authenticated users without org context to org selection", async () => {
    mockedAuth.mockResolvedValue({
      userId: "user_123",
      orgId: null,
    } as never);

    await expect(DemoPage()).rejects.toThrow("REDIRECT:/workspace/select-organization?redirect_url=%2Fdemo");
    expect(mockedRedirect).toHaveBeenCalledWith("/workspace/select-organization?redirect_url=%2Fdemo");
  });

  it("renders the authenticated demo page for a provisioned prospect", async () => {
    const element = await DemoPage();
    const html = renderToStaticMarkup(element);

    expect(mockedGetDemoProspectByUserAndOrg).toHaveBeenCalledWith({
      clerkUserId: "user_123",
      orgId: "org_123",
    });
    expect(html).toContain("Start your authenticated demo call");
    expect(html).toContain("North Ridge Agency");
  });
});
