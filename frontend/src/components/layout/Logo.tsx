import { Link } from "react-router-dom";
import { LampMark } from "@/components/icons";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  light?: boolean;
}

const Logo = ({ className, light }: LogoProps) => (
  <Link
    to="/"
    aria-label="INTERIO home"
    className={cn(
      "inline-flex items-center gap-1.5 font-serif text-xl font-semibold tracking-[0.12em]",
      light ? "text-card" : "text-foreground",
      className,
    )}
  >
    <LampMark className={cn("h-5 w-5", light ? "text-card" : "text-primary")} />
    INTERIO
  </Link>
);

export default Logo;
