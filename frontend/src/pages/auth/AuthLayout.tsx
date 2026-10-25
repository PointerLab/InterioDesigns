import type { ReactNode } from "react";
import Logo from "@/components/layout/Logo";

interface AuthLayoutProps {
  image: string;
  quote: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

const AuthLayout = ({ image, quote, title, subtitle, children }: AuthLayoutProps) => (
  <div className="grid min-h-screen lg:grid-cols-2">
    <div className="relative hidden lg:block">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
      <div className="absolute left-10 top-8">
        <Logo light />
      </div>
      <p className="absolute bottom-12 left-10 right-10 max-w-md font-serif text-3xl leading-snug text-card">{quote}</p>
    </div>

    <div className="flex flex-col px-5 py-8 sm:px-10">
      <div className="lg:hidden">
        <Logo />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <h1 className="font-serif text-3xl text-foreground">{title}</h1>
        {subtitle && <div className="mt-2 text-muted-foreground">{subtitle}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  </div>
);

export default AuthLayout;
