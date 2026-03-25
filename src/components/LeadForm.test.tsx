import { renderToStaticMarkup } from "react-dom/server";
import LeadForm from "@/components/LeadForm";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} width={props.width} height={props.height} className={props.className} />
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("LeadForm", () => {
  it("only shows the verification link CTA", () => {
    const html = renderToStaticMarkup(<LeadForm />);

    expect(html).toContain("Send verification link");
    expect(html).not.toContain("Start paid training");
  });
});
