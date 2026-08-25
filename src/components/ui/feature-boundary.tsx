"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { copy } from "@/content/copy";

/**
 * Contains a failure to one interactive panel.
 *
 * The route-level boundary replaces the whole page, which is the wrong trade
 * for an artwork page: if the AR panel or the configurator throws, the piece,
 * its sizes, its materials and the inquiry button are all still useful and
 * should stay on screen. A lost preview should not cost the inquiry.
 *
 * React only exposes error boundaries through a class component, so this is
 * one — deliberately the only class in the codebase.
 */
export class FeatureBoundary extends Component<
  {
    children: ReactNode;
    label?: string;
    /**
     * Static content the panel was wrapping — a heading, a description — kept
     * on screen when the interactive part is dropped. Without it, an island
     * that owns the page's `h1` takes the heading down with it.
     */
    fallback?: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Feature failed${this.props.label ? `: ${this.props.label}` : ""}`, error, info);
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <>
        {this.props.fallback}
        <section
          role="alert"
          className="mt-6 rounded-xl border border-line bg-surface p-6 text-center sm:p-10"
        >
          <h2 className="font-display text-xl font-medium">{copy.error.feature.title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
            {copy.error.feature.body}
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-ink"
          >
            {copy.error.feature.retry}
          </button>
        </section>
      </>
    );
  }
}
