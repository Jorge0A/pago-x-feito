"use client";

import { useState } from "react";
import { formatBRL, parseBRL } from "@pxf/core";
import { Input } from "@/components/ui/input";

/**
 * Text input for BRL amounts. Shows "1.234,56" to the user; submits integer centavos in a
 * hidden field named `name`. Accepts anything parseBRL understands.
 */
export function MoneyInput({
  name,
  defaultCentavos,
  required,
  id,
  placeholder = "0,00",
}: {
  name: string;
  defaultCentavos?: number | null;
  required?: boolean;
  id?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(
    defaultCentavos === null || defaultCentavos === undefined ? "" : formatBRL(defaultCentavos, { symbol: false }),
  );
  const centavos = parseBRL(text);
  const invalid = text.trim() !== "" && centavos === null;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        required={required}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        className="h-11 pl-9 text-right text-base tabular-nums"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (centavos !== null) setText(formatBRL(centavos, { symbol: false }));
        }}
      />
      <input type="hidden" name={name} value={centavos === null ? "" : String(centavos)} />
    </div>
  );
}
