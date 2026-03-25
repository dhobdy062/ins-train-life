import { renderToStaticMarkup } from "react-dom/server";
import SiteNav from "@/components/SiteNav";
import { usePathname } from "next/navigation";

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
    children: unknown;
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
  SignedIn: ({ children }: { children: unknown }) => <>{children}</>,
  SignedOut: ({ children }: { children: unknown }) => <>{children}</>,
  SignOutButton: ({ children }: { children: unknown }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
}));

const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe("SiteNav", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePathname.mockReturnValue("/");
  });

  it("links to the FAQ page in a new tab", () => {
    const html = renderToStaticMarkup(<SiteNav />);

    expect(html).toContain('href="/FAQ_Page.html"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Frequently Asked Questions");
  });
});
