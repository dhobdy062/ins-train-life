import { renderToStaticMarkup } from "react-dom/server";
import Home from "@/app/page";
import { auth } from "@clerk/nextjs/server";
import { normalizeBillingSelection } from "@/lib/billing";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: { children: unknown }) => <>{children}</>,
  SignedOut: ({ children }: { children: unknown }) => <>{children}</>,
  SignUpButton: ({ children }: { children: unknown }) => <>{children}</>,
}));

jest.mock("@/components/LeadForm", () => ({
  __esModule: true,
  default: () => <div data-testid="lead-form" />,
}));

jest.mock("@/components/PricingCards", () => ({
  __esModule: true,
  default: () => <div data-testid="pricing-cards" />,
}));

jest.mock("@/lib/billing", () => ({
  normalizeBillingSelection: jest.fn(),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedNormalizeBillingSelection = normalizeBillingSelection as jest.MockedFunction<
  typeof normalizeBillingSelection
>;

describe("Home", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({ userId: "user_1" } as Awaited<ReturnType<typeof auth>>);
    mockedNormalizeBillingSelection.mockReturnValue({
      planId: "starter",
      interval: "monthly",
    } as ReturnType<typeof normalizeBillingSelection>);
  });

  it("removes public homepage CTAs while keeping the signed-in workspace CTA", async () => {
    const element = await Home({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain("Start a sample call");
    expect(html).not.toContain("Create trainer account");
    expect(html).toContain('href="/workspace/dashboard"');
    expect(html).toContain("Open workspace");
  });

  it("combines difficulty and scoring into one two-column section", async () => {
    const element = await Home({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain(">D1<");
    expect(html).toContain(">D2<");
    expect(html).toContain(">D3<");
    expect(html).toContain(">D4<");
    expect(html).toContain(">D5<");
    expect(html).not.toContain("Busy schedule");
    expect(html).not.toContain("Does not remember lead");
    expect(html).not.toContain("Needs spouse");
    expect(html).not.toContain("Already covered");
    expect(html).not.toContain("High interest, high skepticism");
    expect(html).toContain("Objection handling");
    expect(html).toContain("Tone and pacing");
    expect(html).toContain("Close effectiveness");
    expect(html).toContain("Time to appointment");
    expect(html).not.toContain("Training coverage");
    expect(html).not.toContain("Customize the Knowledge Base");
    expect(html).not.toContain("Scoring output");
  });
});
