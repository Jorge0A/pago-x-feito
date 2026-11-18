"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

const REVEAL = 88; // px of action area revealed on the left

/**
 * Row that slides to the right to reveal a delete action. Works with touch and mouse.
 * Vertical movement is left to the page scroll; only clearly horizontal drags move the row.
 */
export function SwipeRow({
  children,
  onDelete,
  deleteLabel = "Excluir",
  className,
}: {
  children: React.ReactNode;
  onDelete: () => Promise<ActionResult>;
  deleteLabel?: string;
  className?: string;
}) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const start = useRef<{ x: number; y: number; id: number; axis: "none" | "h" | "v" } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: "none" };
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (s.axis === "none") {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      s.axis = Math.abs(mx) > Math.abs(my) ? "h" : "v";
      if (s.axis === "h") (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (s.axis !== "h") return;
    e.preventDefault();
    const base = open ? REVEAL : 0;
    setDx(Math.max(0, Math.min(REVEAL + 24, base + mx)));
  }
  function onPointerUp(e: React.PointerEvent) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    if (s.axis !== "h") return;
    // Decide from the pointer itself: state from the last move may not have rendered yet.
    const travelled = (open ? REVEAL : 0) + (e.clientX - s.x);
    const shouldOpen = travelled > REVEAL / 2;
    setOpen(shouldOpen);
    setDx(shouldOpen ? REVEAL : 0);
  }
  function close() {
    setOpen(false);
    setDx(0);
  }
  function remove() {
    startTransition(async () => {
      const r = await onDelete();
      if (r.ok) toast.success(r.message ?? "Excluído");
      else {
        toast.error(r.error);
        close();
      }
    });
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-y-0 left-0 flex" style={{ width: REVEAL }} aria-hidden={!open}>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={remove}
          disabled={pending}
          className="flex w-full flex-col items-center justify-center gap-1 bg-destructive text-xs font-medium text-white disabled:opacity-60"
        >
          <Trash2 className="size-5" />
          {pending ? "…" : deleteLabel}
        </button>
      </div>
      <div
        className="relative select-none bg-background"
        style={{ transform: `translateX(${dx}px)`, transition: start.current?.axis === "h" ? "none" : "transform 160ms ease-out", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (open) {
            e.stopPropagation();
            e.preventDefault();
            close();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
