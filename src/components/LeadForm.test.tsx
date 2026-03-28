import { renderToStaticMarkup } from "react-dom/server";
import LeadForm, { LeadFormStatus, submitLeadForm } from "@/components/LeadForm";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} width={props.width} height={props.height} className={props.className} />
  ),
}));

describe("LeadForm", () => {
  it("shows the status message in a live region", () => {
    const html = renderToStaticMarkup(<LeadFormStatus message="Check your email for the sign-in link to access your demo." />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
  });

  it("submits successfully and resets the form", async () => {
    const reset = jest.fn();
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
    const formData = new FormData();
    formData.set("name", "Jordan Blake");
    formData.set("agency", "North Ridge Agency");
    formData.set("email", "jordan@example.com");

    await expect(submitLeadForm(formData, { fetchImpl, reset })).resolves.toEqual({
      status: "Check your email for the sign-in link to access your demo.",
    });

    expect(fetchImpl).toHaveBeenCalledWith("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jordan Blake",
        agency: "North Ridge Agency",
        email: "jordan@example.com",
      }),
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("returns an error status when submission fails", async () => {
    const reset = jest.fn();
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false });
    const formData = new FormData();

    await expect(submitLeadForm(formData, { fetchImpl, reset })).resolves.toEqual({
      status: "Something went wrong. Please try again.",
    });

    expect(reset).not.toHaveBeenCalled();
  });

  it("still renders the public form CTA", () => {
    const html = renderToStaticMarkup(<LeadForm />);

    expect(html).toContain("Send demo access link");
    expect(html).not.toContain("Start paid training");
  });
});
