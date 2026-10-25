import { Link } from "react-router-dom";
import { SITE } from "@/lib/site";
import { usePageTitle } from "@/lib/usePageTitle";

const UPDATED = "27 September 2026";

const PRIVACY = [
  {
    heading: "What we collect",
    body: [
      "Account details you give us: name, email address, phone number and city.",
      "Estimates you save: property details, the package, furniture and services you picked, and the calculated cost.",
      "Consultation bookings and messages sent through the contact form.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To show your saved estimates, designs and bookings in your dashboard.",
      "So our design team can prepare for and contact you about consultations you book.",
      "To reply to messages you send us. We do not sell your data or share it with advertisers.",
    ],
  },
  {
    heading: "Storage and security",
    body: [
      "Passwords are stored as salted hashes and are never visible to our staff.",
      "You stay signed in using a short-lived token stored in your browser. Signing out removes it.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can edit your profile and delete saved estimates at any time from your dashboard.",
      `To delete your account and all related data, email ${SITE.email}.`,
    ],
  },
];

const TERMS = [
  {
    heading: "Estimates are indicative",
    body: [
      "Costs shown by the estimator are based on standard rates, your inputs and city-level price adjustments.",
      "They are not a quotation. The final price is confirmed in writing after a site measurement and may change with site conditions, material availability and design changes.",
    ],
  },
  {
    heading: "Taxes",
    body: ["Estimates include GST at 18% unless stated otherwise."],
  },
  {
    heading: "Consultations",
    body: [
      "Booking a slot sends a request to our studio. It is confirmed once our team marks it confirmed in your dashboard.",
      "Please cancel from your dashboard if you can't make it, so the slot can be offered to someone else.",
    ],
  },
  {
    heading: "Design images",
    body: [
      "Images in the design gallery show representative work and styles. Actual finishes depend on the materials chosen for your project.",
    ],
  },
  {
    heading: "Your account",
    body: ["Keep your password private. You are responsible for activity on your account."],
  },
];

const Legal = ({ page }: { page: "privacy" | "terms" }) => {
  const sections = page === "privacy" ? PRIVACY : TERMS;
  const title = page === "privacy" ? "Privacy policy" : "Terms of service";
  usePageTitle(title);

  return (
    <div className="container-page max-w-3xl py-14">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 font-serif text-4xl text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>

      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-serif text-2xl text-foreground">{section.heading}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        Questions?{" "}
        <Link to="/contact" className="text-primary hover:underline">
          Contact us
        </Link>{" "}
        or email{" "}
        <a href={`mailto:${SITE.email}`} className="text-primary hover:underline">
          {SITE.email}
        </a>
        .
      </p>
    </div>
  );
};

export default Legal;
