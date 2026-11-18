"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { buildStoragePath, DOCUMENTS_BUCKET } from "@pxf/core";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { registerUploadAction } from "./actions";

const ACCEPT = ".xlsx,.xls,.xlsm,.csv,.pdf,image/*";
const MAX_BYTES = 25 * 1024 * 1024;

export function UploadButton({ obraId, size = "default", label = "Enviar arquivo" }: { obraId: string; size?: "default" | "sm" | "lg"; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const supabase = createClient();
    let lastSpreadsheet: string | null = null;
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: maior que 25 MB`);
        continue;
      }
      setBusy(file.name);
      const path = buildStoragePath(obraId, file.name, crypto.randomUUID());
      const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) {
        toast.error(`${file.name}: ${error.message}`);
        continue;
      }
      const res = await registerUploadAction(obraId, { storagePath: path, name: file.name, mime: file.type || null, size: file.size });
      if (!res.ok) {
        toast.error(`${file.name}: ${res.error}`);
        continue;
      }
      toast.success(`${file.name} recebido`);
      if (res.spreadsheet) lastSpreadsheet = res.itemId;
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    if (lastSpreadsheet) router.push(`/app/${obraId}/entrada/${lastSpreadsheet}`);
    else router.refresh();
  }

  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
      <Button size={size} onClick={() => input.current?.click()} disabled={busy !== null}>
        <Upload className="size-4" />
        {busy ? "Enviando…" : label}
      </Button>
    </>
  );
}
