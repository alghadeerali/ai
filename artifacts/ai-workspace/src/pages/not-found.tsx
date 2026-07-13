import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight">Page Not Found</h2>
          <p className="mb-8 text-sm text-muted-foreground">
            The page you are looking for ({location}) doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button className="w-full">Return Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
