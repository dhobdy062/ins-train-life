import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SiteNav from "@/components/SiteNav";
import { usePathname } from "next/navigation";

let mockSignedInVisible = false;
let mockSignedOutVisible = true;

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
    target,
    rel,
    "aria-label": ariaLabel,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
    target?: string;
    rel?: string;
    "aria-label"?: string;
  }) => (
    <a href={href} className={className} target={target} rel={rel} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} width={props.width} height={props.height} className={props.className} />
  ),
}));

jest.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: { children: ReactNode }) => (mockSignedInVisible ? <>{children}</> : null),
  SignedOut: ({ children }: { children: ReactNode }) => (mockSignedOutVisible ? <>{children}</> : null),
  SignOutButton: ({ children }: { children: ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe("SiteNav", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePathname.mockReturnValue("/");
    mockSignedInVisible = false;
    mockSignedOutVisible = true;
  });

  it("links to the FAQ page in a new tab", () => {
    const html = renderToStaticMarkup(<SiteNav />);

    expect(html).toContain('href="/FAQ_Page.html"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain("Frequently Asked Questions");
  });

  it("returns null on dashboard routes", () => {
    mockedUsePathname.mockReturnValue("/dashboard/trainer/overview");

    const html = renderToStaticMarkup(<SiteNav />);

    expect(html).toBe("");
  });

  it("shows signed-out controls when the user is not signed in", () => {
    mockSignedInVisible = false;
    mockSignedOutVisible = true;

    const html = renderToStaticMarkup(<SiteNav />);

    expect(html).toContain("Sign in");
    expect(html).toContain("Sign up");
    expect(html).not.toContain("Open workspace");
    expect(html).not.toContain("Sign out");
  });

  it("shows signed-in controls when the user is signed in", () => {
    mockSignedInVisible = true;
    mockSignedOutVisible = false;

    const html = renderToStaticMarkup(<SiteNav />);

    expect(html).toContain("Open workspace");
    expect(html).toContain("Sign out");
    expect(html).toContain("user-button");
    expect(html).not.toContain("Sign in");
    expect(html).not.toContain("Sign up");
  });
});
