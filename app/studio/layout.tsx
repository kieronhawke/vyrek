export const dynamic = "force-static";

export { metadata, viewport } from "next-sanity/studio";

// Strip the marketing-site global tap-target rule from this subtree so
// Studio's compact buttons don't get inflated to 48px.
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        button, a, [role="button"] { min-height: 0; min-width: 0; }
      `}</style>
      {children}
    </>
  );
}
