import { renderToStaticMarkup } from "react-dom/server";
import PublicDemoConsole, { toFriendlyPublicDemoError } from "@/components/PublicDemoConsole";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PublicDemoConsole", () => {
  it("shows the authenticated demo CTA and organization context", () => {
    const html = renderToStaticMarkup(
      <PublicDemoConsole organizationName="North Ridge Agency" />,
    );

    expect(html).toContain("Start a Demo Call");
    expect(html).toContain("North Ridge Agency");
  });

  it("announces demo status updates through a live region", () => {
    const html = renderToStaticMarkup(
      <PublicDemoConsole organizationName="North Ridge Agency" />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("shows the upgrade path when the authenticated demo limit is reached", () => {
    const html = renderToStaticMarkup(
      <PublicDemoConsole organizationName="North Ridge Agency" trialLimitReached />,
    );

    expect(html).toContain("Upgrade to continue practice");
    expect(html).toContain("You have used both demo sessions.");
  });

  it("maps trial-start API failures to friendly demo copy", () => {
    expect(toFriendlyPublicDemoError("Unable to start trial call.")).toBe(
      "We could not start your demo call. Please try again in a moment.",
    );
  });
});
