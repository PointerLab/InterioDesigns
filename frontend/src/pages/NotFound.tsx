import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
    <p className="eyebrow">Error 404</p>
    <h1 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">This room doesn't exist</h1>
    <p className="mt-3 max-w-md text-muted-foreground">
      The page you were looking for has moved or never existed. Try one of these instead.
    </p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/designs">Browse designs</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
