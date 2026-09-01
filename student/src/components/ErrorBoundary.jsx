import React from "react";
import { Button, Card } from "./ui";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Student interface error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className="grid min-h-[100dvh] place-items-center bg-paper p-6"><Card className="max-w-lg p-7 text-center" role="alert"><p className="eyebrow eyebrow-accent">Something interrupted this page</p><h1 className="display mt-3 text-2xl">Your Discovr session is safe</h1><p className="mt-3 text-sm leading-relaxed text-ink-3">Reload the page to continue. If this keeps happening, return home and try the action again.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={() => window.location.reload()}>Reload page</Button><Button href="/" variant="secondary">Return home</Button></div></Card></div>;
  }
}
