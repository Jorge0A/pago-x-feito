import { formatBRL, type Centavos } from "@pxf/core";
import { cn } from "@/lib/utils";

export function Money({
  value,
  className,
  muted,
}: {
  value: Centavos;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span className={cn("tabular-nums", muted && "text-muted-foreground", className)}>{formatBRL(value)}</span>
  );
}
