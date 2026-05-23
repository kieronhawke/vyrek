import type { ReactNode } from "react";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import {
  Callout,
  PullQuote,
  Stat,
  StatGrid,
  KeyTakeaways,
} from "@/components/blog/mdx-callouts";

/**
 * Tailwind-prose-flavoured styles for MDX content. We don't use the
 * `@tailwindcss/typography` plugin, the brief's design tokens are bespoke,
 * so we hand-tune each element to the Vyrek palette.
 *
 * Authors can use these custom components inline in MDX:
 *   <Callout tone="tip" title="...">  <PullQuote attribution="...">
 *   <Stat value="..." label="...">    <StatGrid> <KeyTakeaways items={...}>
 */

type AnchorAttrs = React.AnchorHTMLAttributes<HTMLAnchorElement>;

function isExternal(href?: string): boolean {
  if (!href) return false;
  return /^https?:\/\//.test(href) && !href.includes("vyrek.");
}

function H2({ children, id, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  // No nested anchor, the entire heading text IS the accessible name.
  // rehype-autolink-headings (`behavior: "wrap"`) handles the click target;
  // we keep the visual style here.
  return (
    <h2
      id={id}
      className="group mt-12 scroll-mt-24 text-balance text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text first:mt-0 md:text-3xl"
      {...rest}
    >
      {children}
    </h2>
  );
}

function H3({ children, id, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      id={id}
      className="mt-8 scroll-mt-24 text-xl font-bold leading-tight tracking-[-0.015em] text-vyrek-text md:text-2xl"
      {...rest}
    >
      {children}
    </h3>
  );
}

function P({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-5 text-base leading-[1.75] text-vyrek-text md:text-lg">
      {children}
    </p>
  );
}

function UL({ children }: { children?: ReactNode }) {
  return (
    <ul className="mt-5 list-disc space-y-2 pl-6 text-base leading-[1.75] text-vyrek-text marker:text-vyrek-accent md:text-lg">
      {children}
    </ul>
  );
}

function OL({ children }: { children?: ReactNode }) {
  return (
    <ol className="mt-5 list-decimal space-y-2 pl-6 text-base leading-[1.75] text-vyrek-text marker:text-vyrek-accent marker:font-mono md:text-lg">
      {children}
    </ol>
  );
}

function LI({ children }: { children?: ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

function Blockquote({ children }: { children?: ReactNode }) {
  return (
    <blockquote className="mt-6 rounded-md border-l-4 border-vyrek-accent bg-vyrek-elevated px-5 py-4 text-base italic leading-relaxed text-vyrek-text md:text-lg">
      {children}
    </blockquote>
  );
}

function A({ children, href, ...rest }: AnchorAttrs) {
  const ext = isExternal(href);
  return (
    <a
      href={href}
      target={ext ? "_blank": undefined}
      rel={ext ? "noopener noreferrer": undefined}
      className="text-vyrek-accent underline decoration-vyrek-accent/40 underline-offset-4 transition-colors hover:decoration-vyrek-accent"
      {...rest}
    >
      {children}
      {ext ? <span aria-hidden> ↗</span>: null}
    </a>
  );
}

function Code({ children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className="rounded-sm border border-vyrek-border-subtle bg-vyrek-overlay px-1.5 py-0.5 font-mono text-[0.92em] text-vyrek-accent"
      {...rest}
    >
      {children}
    </code>
  );
}

function Pre({ children, ...rest }: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className="mt-5 overflow-x-auto rounded-md border border-vyrek-border-subtle bg-vyrek-overlay p-4 font-mono text-[13px] leading-relaxed text-vyrek-text"
      {...rest}
    >
      {children}
    </pre>
  );
}

function Strong({ children }: { children?: ReactNode }) {
  return <strong className="font-semibold text-vyrek-text">{children}</strong>;
}

function Hr() {
  return <hr className="my-10 border-t border-vyrek-border-subtle" />;
}

function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm md:text-base">{children}</table>
    </div>
  );
}

function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="border-b border-vyrek-border bg-vyrek-elevated px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-vyrek-text-tertiary">
      {children}
    </th>
  );
}

function Td({ children }: { children?: ReactNode }) {
  return (
    <td className="border-b border-vyrek-border-subtle px-3 py-2 align-top text-vyrek-text">
      {children}
    </td>
  );
}

function Img({
  src,
  alt,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src: undefined}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      className="mt-6 w-full rounded-md border border-vyrek-border-subtle"
      {...rest}
    />
  );
}

export const proseComponents: MDXRemoteProps["components"] = {
  h2: H2,
  h3: H3,
  p: P,
  ul: UL,
  ol: OL,
  li: LI,
  blockquote: Blockquote,
  a: A,
  code: Code,
  pre: Pre,
  strong: Strong,
  hr: Hr,
  table: Table,
  th: Th,
  td: Td,
  img: Img,
  // Custom MDX components, drop into any.mdx file
  Callout,
  PullQuote,
  Stat,
  StatGrid,
  KeyTakeaways,
};
