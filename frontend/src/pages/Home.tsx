import { Link } from "react-router-dom";
import DesignCard, { DesignGridSkeleton } from "@/components/common/DesignCard";
import DayNightHero from "@/components/home/DayNightHero";
import ProjectShowcase from "@/components/home/ProjectShowcase";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { useCatalog, useDesigns } from "@/lib/queries";
import { usePageTitle } from "@/lib/usePageTitle";

const STEPS = [
  {
    title: "Describe your space",
    body: "Home, office or shop, its size, and whether it's a new fit-out or a renovation.",
  },
  {
    title: "Pick a package",
    body: "Basic, Standard or Premium. Each sets the finish quality, rate per sq.ft and warranty.",
  },
  {
    title: "Add furniture and services",
    body: "Choose modular units, furniture and renovation work. The total updates as you go.",
  },
  {
    title: "Save and meet a designer",
    body: "Save the itemised estimate, download it as a PDF and book a consultation to confirm.",
  },
];

const ENTRY_POINTS = [
  {
    title: "Full home interior",
    body: "Every room, from 1 BHK flats to villas.",
    image: "/images/hero-living-room.jpg",
    to: "/estimate?property=residential&scope=full",
  },
  {
    title: "Kitchen",
    body: "Modular kitchens, tall units and counters.",
    image: "/images/card-stack-2.jpg",
    to: "/estimate?property=residential&scope=kitchen",
  },
  {
    title: "Wardrobes",
    body: "Sliding, hinged and walk-in storage.",
    image: "/images/who-we-are-2.jpg",
    to: "/estimate?property=residential&scope=wardrobe",
  },
  {
    title: "Office or shop",
    body: "Workstations, cabins, counters and display.",
    image: "/images/category-office.jpg",
    to: "/estimate?property=office",
  },
];

const VALUES = [
  {
    title: "Timeless elegance",
    body: "Personal spaces that outlast trends and stay relevant for years.",
  },
  {
    title: "Thoughtful function",
    body: "Contemporary design that makes everyday routines easier.",
  },
  {
    title: "Calm, light-filled rooms",
    body: "Homes that feel like a retreat from the world outside.",
  },
  {
    title: "Honest craftsmanship",
    body: "Quality materials, clear pricing and a warranty on every package.",
  },
];

const FAQS = [
  {
    q: "How accurate is the online estimate?",
    a: "It uses the same rates our designers quote from, adjusted for your city. Most final quotes land within about 10% of the estimate. The exact figure is confirmed after a site measurement.",
  },
  {
    q: "Is GST included?",
    a: "Yes. Every estimate shows the subtotal, the city adjustment and 18% GST separately, and the total includes GST.",
  },
  {
    q: "What is included in the rate per sq.ft?",
    a: "Design, false ceiling, lighting, painting, electrical fittings and finishing for the carpet area you enter. Furniture and optional services are priced separately so you can see exactly what you're paying for.",
  },
  {
    q: "Can I change an estimate after saving it?",
    a: "Yes. Open it from your dashboard and choose Edit. It reopens in the estimator with your answers, and saving updates the same estimate.",
  },
  {
    q: "Do I have to create an account?",
    a: "No. You can work through the estimator and see the full breakdown without an account. You only need one to save estimates, keep a shortlist of designs or book a consultation.",
  },
  {
    q: "How long does a project take?",
    a: "Usually 4 to 12 weeks depending on the package, the size of the space and whether renovation work is involved. Every estimate includes a phase-by-phase timeline.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="section-title mt-2">{title}</h2>
        {body && <p className="mt-3 text-muted-foreground">{body}</p>}
      </div>
      {action}
    </div>
  );
}

const Home = () => {
  usePageTitle();
  const { data: catalog } = useCatalog();
  const featured = useDesigns("featured=true&limit=6");

  const facts = catalog
    ? [
        { value: String(catalog.packages.length), label: "packages, from Basic to Premium" },
        { value: String(catalog.cities.length), label: "cities with local pricing" },
        {
          value: `${Math.min(...catalog.packages.map((p) => p.base_timeline_weeks))}+`,
          label: "weeks from design to handover",
        },
        {
          value: `${Math.max(...catalog.packages.map((p) => p.warranty_years))} yr`,
          label: "warranty on Premium interiors",
        },
      ]
    : [];

  return (
    <>
      <DayNightHero />

      <section id="about" className="scroll-mt-20 border-b border-border bg-card py-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">About INTERIO</p>
            <h2 className="section-title mt-2">Sophisticated spaces, priced in the open</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We design homes, offices and shops where contemporary looks meet everyday function. Every project begins
              with understanding how you live and work, and every quote starts with a transparent, itemised estimate you
              can build yourself.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
              {VALUES.map((value, i) => (
                <div key={value.title}>
                  <dt className="flex items-baseline gap-2 font-medium text-foreground">
                    <span className="font-serif text-sm text-primary">0{i + 1}</span>
                    {value.title}
                  </dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{value.body}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <img
              src="/images/philosophy-room.jpg"
              alt="Dining area with plants and open shelving"
              className="col-span-3 aspect-[3/4] w-full rounded-lg object-cover"
            />
            <div className="col-span-2 flex flex-col gap-4 pt-10">
              <img
                src="/images/who-we-are-1.jpg"
                alt="Living room with olive sofa"
                className="aspect-square w-full rounded-lg object-cover"
              />
              <img
                src="/images/gallery-4.jpg"
                alt="Scandinavian bedroom"
                className="aspect-square w-full rounded-lg object-cover"
              />
            </div>
          </div>
        </div>
        {facts.length > 0 && (
          <div className="container-page mt-16">
            <dl className="grid grid-cols-2 divide-border rounded-lg border border-border md:grid-cols-4 md:divide-x">
              {facts.map((fact) => (
                <div key={fact.label} className="p-6">
                  <dt className="font-serif text-3xl text-foreground">{fact.value}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{fact.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <section id="how-it-works" className="container-page scroll-mt-20 py-20">
        <SectionHeading
          eyebrow="How it works"
          title="From idea to itemised estimate in minutes"
          body="No phone calls needed to find out what your interior will cost."
        />
        <ol className="grid gap-8 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-foreground pt-5">
              <p className="font-serif text-2xl text-primary">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 font-sans text-lg font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-4">
        <SectionHeading eyebrow="Start an estimate" title="What would you like to price?" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ENTRY_POINTS.map((entry) => (
            <Link
              key={entry.title}
              to={entry.to}
              className="group block overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={entry.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5">
                <h3 className="font-serif text-xl text-foreground">{entry.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{entry.body}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Calculate <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {catalog && (
        <section className="container-page py-20">
          <SectionHeading
            eyebrow="Packages"
            title="Choose the finish, we handle the rest"
            action={
              <Button asChild variant="outline">
                <Link to="/packages">Compare packages</Link>
              </Button>
            }
          />
          <div className="grid gap-5 md:grid-cols-3">
            {catalog.packages.map((pkg) => (
              <article key={pkg.tier} className="flex flex-col rounded-lg border border-border bg-card p-6">
                <h3 className="font-serif text-2xl text-foreground">{pkg.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{pkg.tagline}</p>
                <p className="mt-5 text-sm text-muted-foreground">
                  From <span className="font-serif text-2xl text-foreground">{formatINR(pkg.rate_per_sqft)}</span> /
                  sq.ft
                </p>
                <ul className="mt-5 flex-1 space-y-2">
                  {pkg.inclusions.slice(0, 4).map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground">
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/estimate?package=${pkg.tier}`}
                  className="mt-6 text-sm font-medium text-primary hover:underline"
                >
                  Estimate with {pkg.title.replace(" Package", "")}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-border bg-muted/50 py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Signature projects" title="Rooms we're proud of" />
          <ProjectShowcase />
        </div>
      </section>

      <section className="container-page py-20">
        <SectionHeading
          eyebrow="Design gallery"
          title="Featured designs"
          body="Save the looks you like. They're kept in your dashboard to show your designer."
          action={
            <Button asChild variant="outline">
              <Link to="/designs">See all designs</Link>
            </Button>
          }
        />
        {featured.isLoading ? (
          <DesignGridSkeleton count={3} />
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data?.results.map((design) => (
              <DesignCard key={design.id} design={design} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 className="section-title mt-2">Before you start</h2>
          <p className="mt-3 text-muted-foreground">
            Can't find what you need?{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Ask us directly
            </Link>
            .
          </p>
        </div>
        <Accordion type="single" collapsible className="border-t border-border">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger className="text-left font-sans text-base font-medium hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="container-page pt-16">
        <div className="flex flex-col items-start gap-6 rounded-lg bg-foreground px-8 py-12 text-background md:flex-row md:items-center md:justify-between md:px-12">
          <div>
            <h2 className="font-serif text-3xl">Ready to see what your space will cost?</h2>
            <p className="mt-2 text-background/70">
              It takes about five minutes. No account needed to see the full estimate.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/estimate">Start your estimate</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background/30 bg-transparent text-background hover:bg-background/10"
            >
              <Link to="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
