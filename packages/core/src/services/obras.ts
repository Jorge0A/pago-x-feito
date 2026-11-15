import { z } from "zod";
import type { DbClient, Tables } from "@pxf/db";
import { isISODate } from "../dates";
import { logEvent } from "./events";

export type WorkHoursRange = [string, string]; // ["08:00", "17:00"]
export type WorkHours = {
  mon: WorkHoursRange[];
  tue: WorkHoursRange[];
  wed: WorkHoursRange[];
  thu: WorkHoursRange[];
  fri: WorkHoursRange[];
  sat: WorkHoursRange[];
  sun: WorkHoursRange[];
  holidays: boolean; // true when work is allowed on holidays
};

export const DEFAULT_WORK_HOURS: WorkHours = {
  mon: [["08:00", "17:00"]],
  tue: [["08:00", "17:00"]],
  wed: [["08:00", "17:00"]],
  thu: [["08:00", "17:00"]],
  fri: [["08:00", "17:00"]],
  sat: [["08:00", "12:00"]],
  sun: [],
  holidays: false,
};

const isoDate = z.string().refine(isISODate, "Data inválida").optional().or(z.literal("").transform(() => undefined));

export const obraSetupSchema = z.object({
  building_name: z.string().trim().min(2, "Informe o nome do condomínio"),
  neighborhood: z.string().trim().max(120).optional(),
  address: z.string().trim().max(240).optional(),
  unit: z.string().trim().max(40).optional(),
  title: z.string().trim().min(2, "Dê um nome à obra"),
  start_date: isoDate,
});
export type ObraSetupInput = z.infer<typeof obraSetupSchema>;

export const obraUpdateSchema = z.object({
  title: z.string().trim().min(2, "Dê um nome à obra"),
  unit: z.string().trim().max(40).optional(),
  start_date: isoDate,
  status: z.enum(["planning", "in_progress", "finished"]),
});
export type ObraUpdateInput = z.infer<typeof obraUpdateSchema>;

export type ObraWithBuilding = Tables<"obras"> & { building: Tables<"buildings"> };

function emptyToNull(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

/** Creates a building and the owner's obra in it. The DB trigger adds the owner membership. */
export async function createObraWithBuilding(
  db: DbClient,
  userId: string,
  userEmail: string | null,
  input: ObraSetupInput,
): Promise<string> {
  const { data: building, error: bErr } = await db
    .from("buildings")
    .insert({
      name: input.building_name,
      neighborhood: emptyToNull(input.neighborhood),
      address: emptyToNull(input.address),
      created_by: userId,
      work_hours: DEFAULT_WORK_HOURS as never,
    })
    .select("id")
    .single();
  if (bErr) throw new Error(`buildings.insert failed: ${bErr.message}`);

  const { data: obra, error: oErr } = await db
    .from("obras")
    .insert({
      building_id: building.id,
      owner_id: userId,
      title: input.title,
      unit: emptyToNull(input.unit),
      start_date: input.start_date ?? null,
      status: "planning",
    })
    .select("id")
    .single();
  if (oErr) throw new Error(`obras.insert failed: ${oErr.message}`);

  const { error: rErr } = await db
    .from("reminder_settings")
    .insert({ obra_id: obra.id, email: userEmail });
  if (rErr) throw new Error(`reminder_settings.insert failed: ${rErr.message}`);

  await logEvent(db, {
    obra_id: obra.id,
    actor_id: userId,
    type: "obra.created",
    payload: { title: input.title, building_name: input.building_name },
  });
  return obra.id;
}

export async function updateObra(db: DbClient, obraId: string, userId: string, input: ObraUpdateInput) {
  const { error } = await db
    .from("obras")
    .update({
      title: input.title,
      unit: emptyToNull(input.unit),
      start_date: input.start_date ?? null,
      status: input.status,
    })
    .eq("id", obraId);
  if (error) throw new Error(`obras.update failed: ${error.message}`);
  await logEvent(db, { obra_id: obraId, actor_id: userId, type: "obra.updated", payload: { ...input } });
}

export async function listObras(db: DbClient): Promise<ObraWithBuilding[]> {
  const { data, error } = await db
    .from("obras")
    .select("*, building:buildings(*)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ObraWithBuilding[];
}

export async function getObra(db: DbClient, obraId: string): Promise<ObraWithBuilding | null> {
  const { data, error } = await db
    .from("obras")
    .select("*, building:buildings(*)")
    .eq("id", obraId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as ObraWithBuilding) ?? null;
}

export function workHoursOf(building: Tables<"buildings">): WorkHours {
  const wh = building.work_hours as unknown;
  if (wh && typeof wh === "object" && "mon" in (wh as object)) return wh as WorkHours;
  return DEFAULT_WORK_HOURS;
}
