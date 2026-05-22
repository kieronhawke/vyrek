import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ComingSoon
      eyebrow="404"
      title="That page isn't here."
      description="Either we moved it, or you followed a stale link. Head back home and try again."
    />
  );
}
