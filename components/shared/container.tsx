import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ElementType } from "react";

type ContainerProps<E extends ElementType> = {
  as?: E;
  className?: string;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "className">;

export function Container<E extends ElementType = "div">({
  as,
  className,
  ...props
}: ContainerProps<E>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn("mx-auto w-full max-w-7xl px-6 md:px-10", className)}
      {...props}
    />
  );
}
