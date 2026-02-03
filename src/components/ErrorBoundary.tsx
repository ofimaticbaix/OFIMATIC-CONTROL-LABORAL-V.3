import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // Keep a log for debugging in the browser console
    console.error("App crashed:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error instanceof Error
        ? this.state.error.message
        : "Se produjo un error inesperado.";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Algo ha fallado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La aplicación ha encontrado un error y no ha podido cargarse.
            </p>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-auto whitespace-pre-wrap">
              {message}
            </pre>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>
                Recargar
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  this.setState({ hasError: false, error: undefined })
                }
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
