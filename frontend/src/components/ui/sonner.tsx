import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="top-center"
    toastOptions={{
      classNames: {
        toast: "bg-card text-foreground border border-border shadow-md rounded-md font-sans",
        description: "text-muted-foreground",
        actionButton: "bg-primary text-primary-foreground",
        cancelButton: "bg-muted text-muted-foreground",
      },
    }}
    {...props}
  />
);

export { Toaster, toast };
