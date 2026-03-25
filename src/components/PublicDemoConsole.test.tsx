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
  it("shows the verified demo CTA", () => {
    const html = renderToStaticMarkup(<PublicDemoConsole state="verified" hasValidDemoAccess />);

    expect(html).toContain("Start a Demo Call");
  });

  it("shows recovery copy when demo access is missing", () => {
    const html = renderToStaticMarkup(<PublicDemoConsole state="default" hasValidDemoAccess={false} />);

    expect(html).toContain("Verification is required");
  });

  it("shows the upgrade path when the trial limit is reached", () => {
    const html = renderToStaticMarkup(
      <PublicDemoConsole state="verified" hasValidDemoAccess trialLimitReached />,
    );

    expect(html).toContain("Upgrade to continue practice");
  });

  it("surfaces call-start failures with public demo copy", () => {
    expect(toFriendlyPublicDemoError("Unable to start trial call.")).toBe(
      "We could not start your demo call. Please try again in a moment.",
    );
  });
});
