// Writes a fixture as a real .xlsx for manual testing: tsx scripts/fixture-xlsx.ts <fixture-name> <out.xlsx>
import { writeFileSync } from "node:fs";
import { utils, write } from "xlsx";
import { SPREADSHEET_FIXTURES } from "../src/fixtures/spreadsheets";

const [name = "planilha-engenheiro", out = `${name}.xlsx`] = process.argv.slice(2);
const fixture = SPREADSHEET_FIXTURES.find((f) => f.name === name);
if (!fixture) {
  console.error(`unknown fixture ${name}; known: ${SPREADSHEET_FIXTURES.map((f) => f.name).join(", ")}`);
  process.exit(1);
}
const wb = utils.book_new();
for (const s of fixture.sheets) utils.book_append_sheet(wb, utils.aoa_to_sheet(s.rows), s.name);
const buf = write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
writeFileSync(out, buf);
writeFileSync(`${out}.b64`, buf.toString("base64"));
console.log(`wrote ${out} (${buf.length} bytes)`);
