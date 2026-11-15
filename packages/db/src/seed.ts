/**
 * Seeds Jorge's real obra into the target project. Idempotent: re-running updates nothing
 * if the building and obra already exist. No CPF or other personal IDs are seeded.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL
 */
import { createServiceClient } from "./index";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerEmail = process.env.OWNER_EMAIL;
if (!url || !key || !ownerEmail) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OWNER_EMAIL are required");
  process.exit(1);
}

const db = createServiceClient(url, key);

async function ensureOwner(): Promise<string> {
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const existing = list.users.find((u) => u.email?.toLowerCase() === ownerEmail!.toLowerCase());
  if (existing) return existing.id;
  const { data, error: createErr } = await db.auth.admin.createUser({
    email: ownerEmail!,
    email_confirm: true,
    user_metadata: { full_name: "Jorge" },
  });
  if (createErr) throw createErr;
  console.log(`created auth user for owner`);
  return data.user.id;
}

async function main() {
  const ownerId = await ensureOwner();

  // Building
  const buildingName = "Condomínio Leaf Loefgren";
  let { data: building } = await db.from("buildings").select("*").eq("name", buildingName).maybeSingle();
  if (!building) {
    const { data, error } = await db
      .from("buildings")
      .insert({
        name: buildingName,
        neighborhood: "Vila Clementino",
        city: "São Paulo",
        created_by: ownerId,
        work_hours: {
          mon: [["08:00", "17:00"]], tue: [["08:00", "17:00"]], wed: [["08:00", "17:00"]],
          thu: [["08:00", "17:00"]], fri: [["08:00", "17:00"]], sat: [["08:00", "12:00"]],
          sun: [], holidays: false,
        },
      })
      .select("*")
      .single();
    if (error) throw error;
    building = data;
    console.log("created building");
  }

  // Obra
  let { data: obra } = await db
    .from("obras")
    .select("*")
    .eq("building_id", building.id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!obra) {
    const { data, error } = await db
      .from("obras")
      .insert({ building_id: building.id, owner_id: ownerId, title: "Obra fina", status: "in_progress" })
      .select("*")
      .single();
    if (error) throw error;
    obra = data;
    console.log("created obra");
  } else {
    console.log("obra already exists; nothing else seeded");
    return;
  }

  await db.from("reminder_settings").upsert({ obra_id: obra.id, email: ownerEmail!, pending_nf_days: 7 });

  // Supplier: BALT
  const { data: balt, error: supErr } = await db
    .from("suppliers")
    .insert({
      obra_id: obra.id,
      name: "BALT Arquitetura LTDA",
      category: "Projeto",
      notes: "Serviço de orçamento executivo (planilha de custos).",
    })
    .select("*")
    .single();
  if (supErr) throw supErr;

  // Contract R$ 4.500,00 in 2 × R$ 2.250,00
  const { data: contract, error: conErr } = await db
    .from("contracts")
    .insert({
      obra_id: obra.id,
      supplier_id: balt.id,
      title: "Orçamento executivo — planilha de custos",
      total_centavos: 450000,
      terms: {
        validity_days: 15,
        tacit_approval_days: 5,
        hourly_rate_centavos: 70000,
        shutdowns: [{ start: "2026-12-19", end: "2027-01-05" }],
      },
    })
    .select("*")
    .single();
  if (conErr) throw conErr;

  const { data: installments, error: instErr } = await db
    .from("installments")
    .insert([
      {
        obra_id: obra.id, contract_id: contract.id, label: "1ª parcela", amount_centavos: 225000,
        due_date: "2026-10-21", trigger: "date", status: "paid", sort_order: 1,
      },
      {
        obra_id: obra.id, contract_id: contract.id, label: "2ª parcela", amount_centavos: 225000,
        due_date: "2026-11-18", trigger: "delivery", trigger_note: "Na entrega da planilha", status: "pending", sort_order: 2,
      },
    ])
    .select("*");
  if (instErr) throw instErr;
  const first = installments.find((i) => i.sort_order === 1)!;

  // Budget line for the contract
  const { data: line, error: lineErr } = await db
    .from("budget_lines")
    .insert({
      obra_id: obra.id,
      supplier_id: balt.id,
      contract_id: contract.id,
      category: "Projeto",
      description: "Orçamento executivo (planilha de custos)",
      qty: 1,
      unit: "vb",
      budgeted_centavos: 450000,
      contracted_centavos: 450000,
      sort_order: 1,
    })
    .select("*")
    .single();
  if (lineErr) throw lineErr;

  // Payment: 1st installment paid 23/10/2026 by Pix, NF pending
  const { error: payErr } = await db.from("payments").insert({
    obra_id: obra.id,
    supplier_id: balt.id,
    installment_id: first.id,
    budget_line_id: line.id,
    amount_centavos: 225000,
    paid_at: "2026-10-23",
    method: "pix",
    nf_status: "pending",
  });
  if (payErr) throw payErr;

  const { error: evErr } = await db.from("events").insert([
    { obra_id: obra.id, actor_id: ownerId, type: "obra.created", payload: { title: obra.title } },
    { obra_id: obra.id, actor_id: ownerId, type: "supplier.created", payload: { supplier_id: balt.id, name: balt.name } },
    { obra_id: obra.id, actor_id: ownerId, type: "contract.created", payload: { contract_id: contract.id, total_centavos: 450000 } },
    { obra_id: obra.id, actor_id: ownerId, type: "payment.confirmed", payload: { amount_centavos: 225000, paid_at: "2026-10-23", method: "pix", supplier_id: balt.id } },
  ]);
  if (evErr) throw evErr;

  console.log("seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
