export function parseCSV(text) {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).length > 1024 * 1024
  )
    throw Error("CSV deve ter até 1 MiB.");
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw Error("Aspas inválidas no CSV.");
      quoted = true;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push(row);
        row = [];
        if (rows.length > 10001) throw Error("Máximo de 10.000 registros.");
      }
    } else {
      if (closed) throw Error("Texto após aspas fechadas no CSV.");
      cell += c;
    }
  }
  if (quoted) throw Error("Aspas não fechadas.");
  if (cell || closed || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows.shift().map(h => h.trim());
  if (headers.some(h => !h) || new Set(headers).size !== headers.length)
    throw Error("Cabeçalhos vazios ou repetidos.");
  return rows
    .filter(r => r.some(x => x !== ""))
    .map((r, i) => {
      if (r.length !== headers.length)
        throw Error("Quantidade de colunas inválida na linha " + (i + 2));
      return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
    });
}
export function clean(rows, { trim = true, dedupe = true } = {}) {
  if (
    !Array.isArray(rows) ||
    rows.length > 10000 ||
    rows.some(r => r === null || typeof r !== "object" || Array.isArray(r))
  )
    throw Error("Informe uma lista de objetos com até 10.000 registros.");
  const seen = new Set();
  let removed = 0;
  const result = [];
  for (const row of rows) {
    const r = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        trim && typeof v === "string" ? v.trim() : v
      ])
    );
    const signature = JSON.stringify(
      Object.keys(r)
        .sort()
        .map(k => [k, r[k]])
    );
    if (dedupe && seen.has(signature)) {
      removed++;
      continue;
    }
    seen.add(signature);
    result.push(r);
  }
  return { rows: result, removed };
}
export function toCSV(rows) {
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const cell = v => {
    let s =
      v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[\s\uFEFF]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [headers, ...rows.map(r => headers.map(h => r[h]))]
    .map(r => r.map(cell).join(","))
    .join("\r\n");
}
export async function process(input) {
  let rows;
  if (input.mode === "csv-json") rows = parseCSV(input.source);
  else {
    if (
      typeof input.source !== "string" ||
      new TextEncoder().encode(input.source).length > 1024 * 1024
    )
      throw Error("JSON deve ter até 1 MiB.");
    rows = JSON.parse(input.source);
  }
  const normalized = clean(rows, { trim: input.trim, dedupe: input.dedupe });
  if (input.mode === "json-csv")
    return {
      text: toCSV(normalized.rows),
      filename: "dados-biziva.csv",
      mime: "text/csv;charset=utf-8",
      summary:
        normalized.rows.length +
        " registros; " +
        normalized.removed +
        " duplicados removidos. Fórmulas de planilha neutralizadas."
    };
  if (input.mode !== "csv-json") throw Error("Conversão inválida.");
  return {
    text: JSON.stringify(normalized.rows, null, 2),
    filename: "dados-biziva.json",
    mime: "application/json",
    summary:
      normalized.rows.length +
      " registros; " +
      normalized.removed +
      " duplicados removidos. Telefones e zeros iniciais preservados."
  };
}
