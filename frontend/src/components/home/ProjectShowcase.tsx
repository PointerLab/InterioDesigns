import { useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { Link } from "react-router-dom";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";

const PROJECTS = [
  {
    slug: "garden-view-dining-retreat",
    title: "Tranquil Modern",
    subtitle: "Dining Retreat",
    description:
      "A sleek, light-filled dining area with floor-to-ceiling windows and views of lush greenery. Soft wood floors, minimal furnishings and muted tones create a calm, elegant atmosphere.",
    image: "/images/dining-retreat.jpg",
  },
  {
    slug: "white-island-kitchen",
    title: "Contemporary",
    subtitle: "Kitchen Haven",
    description:
      "An open kitchen with a quartz island, copper pendants and plenty of natural light. Clean lines and warm wood tones make it the heart of the home.",
    image: "/images/card-stack-2.jpg",
  },
  {
    slug: "skyline-master-bedroom",
    title: "Urban Luxury",
    subtitle: "Master Suite",
    description:
      "A bedroom retreat with a panoramic city view. Plush textures, a neutral palette and layered lighting make it a place to rest.",
    image: "/images/card-stack-3.jpg",
  },
];

/** Swipeable stack of signature projects. */
const ProjectShowcase = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (step: number) => {
    setDirection(step);
    setIndex((i) => (i + step + PROJECTS.length) % PROJECTS.length);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) go(info.offset.x < 0 ? 1 : -1);
  };

  const project = PROJECTS[index];

  return (
    <div className="relative">
      {/* Cards peeking out behind the active one */}
      <div className="absolute inset-x-6 -bottom-3 h-full rounded-lg border border-border bg-card/70" aria-hidden />
      <div className="absolute inset-x-3 -bottom-1.5 h-full rounded-lg border border-border bg-card/85" aria-hidden />

      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={project.slug}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={handleDragEnd}
            className="grid cursor-grab active:cursor-grabbing md:grid-cols-2"
          >
            <div className="order-2 flex flex-col justify-center p-7 md:order-1 md:p-12">
              <p className="eyebrow">
                Project {index + 1} of {PROJECTS.length}
              </p>
              <h3 className="mt-3 font-serif text-3xl leading-tight text-foreground md:text-4xl">
                {project.title}
                <br />
                <span className="font-normal text-muted-foreground">{project.subtitle}</span>
              </h3>
              <p className="mt-5 max-w-sm leading-relaxed text-muted-foreground">{project.description}</p>
              <div className="mt-8 flex items-center gap-3">
                <Button asChild variant="dark">
                  <Link to={`/designs/${project.slug}`} draggable={false}>
                    View design
                  </Link>
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous project">
                    <IconArrowLeft />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next project">
                    <IconArrowRight />
                  </Button>
                </div>
              </div>
            </div>
            <div className="order-1 aspect-[4/3] md:order-2 md:aspect-auto md:min-h-[420px]">
              <img
                src={project.image}
                alt={`${project.title} ${project.subtitle}`}
                draggable={false}
                className="h-full w-full select-none object-cover"
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProjectShowcase;
