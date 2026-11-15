"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ActionResult } from "@/lib/action-result";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/**
 * Bottom sheet with a server-action form. Closes itself and toasts on success.
 * `children` renders the fields; `trigger` opens the sheet.
 */
export function FormSheet({
  trigger,
  title,
  description,
  action,
  submitLabel = "Salvar",
  successMessage = "Salvo",
  children,
}: {
  /** A <Button> element; it becomes the trigger itself (no wrapper), keeping native button semantics. */
  trigger: React.ReactElement;
  title: string;
  description?: string;
  action: Action;
  submitLabel?: string;
  successMessage?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);
  const lastHandled = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.ok) {
      toast.success(successMessage);
      setOpen(false);
    }
  }, [state, successMessage]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl px-5 pb-8">
        <SheetHeader className="px-0 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
        </SheetHeader>
        <form action={formAction} className="space-y-4">
          {children}
          {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
            {pending ? "Salvando…" : submitLabel}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
