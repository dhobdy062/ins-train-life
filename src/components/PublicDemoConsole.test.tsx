import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import PublicDemoConsole, { isDemoCallBlocked, toFriendlyPublicDemoError } from "@/components/PublicDemoConsole";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PublicDemoConsole", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows the verified demo CTA", () => {
    const html = renderToStaticMarkup(<PublicDemoConsole state="verified" hasValidDemoAccess />);

    expect(html).toContain("Start a Demo Call");
  });

  it("shows recovery copy when demo access is missing", () => {
    const html = renderToStaticMarkup(<PublicDemoConsole state="default" hasValidDemoAccess={false} />);

    expect(html).toContain("Verification is required");
    expect(html).toContain("/#lead-form");
  });

  it("announces demo status updates through a live region", () => {
    const html = renderToStaticMarkup(<PublicDemoConsole state="verified" hasValidDemoAccess />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("keeps invalid-link state in recovery mode even with a stale demo cookie", () => {
    render(<PublicDemoConsole state="invalid-link" hasValidDemoAccess />);

    expect(screen.getByRole("button", { name: "Start a Demo Call" })).toBeDisabled();
    expect(screen.getByText(/This verification link is invalid or expired/i)).toBeInTheDocument();
  });

  it("shows the upgrade path when the trial limit is reached", () => {
    const html = renderToStaticMarkup(
      <PublicDemoConsole state="verified" hasValidDemoAccess trialLimitReached />,
    );

    expect(html).toContain("Upgrade to continue practice");
  });

  it("surfaces call-start failures with public demo copy", async () => {
    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockedFetch.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: "Unable to start trial call." }),
    } as Response);

    render(<PublicDemoConsole state="verified" hasValidDemoAccess />);
    fireEvent.click(screen.getByRole("button", { name: "Start a Demo Call" }));

    expect(await screen.findByText("We could not start your demo call. Please try again in a moment.")).toBeInTheDocument();
  });

  it("blocks demo-call starts for invalid links and missing verification", () => {
    expect(isDemoCallBlocked("invalid-link", true)).toBe(true);
    expect(isDemoCallBlocked("default", false)).toBe(true);
    expect(isDemoCallBlocked("verified", true)).toBe(false);
  });

  it("maps trial-start API failures to friendly public demo copy", () => {
    expect(toFriendlyPublicDemoError("Unable to start trial call.")).toBe(
      "We could not start your demo call. Please try again in a moment.",
    );
  });
});
