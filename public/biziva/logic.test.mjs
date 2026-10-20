import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "./server.mjs";
test("local server serves assets but refuses writes, source and traversal", async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const good = await fetch(base + "/biziva/index.html");
    assert.equal(good.status, 200);
    assert.ok(
      good.headers.get("content-security-policy").includes("connect-src 'none'")
    );
    assert.equal(good.headers.get("cache-control"), "no-store");
    for (const p of [
      "/biziva/server.mjs",
      "/biziva/../../package.json",
      "/biziva/%2e%2e%2fpackage.json",
      "/.env"
    ])
      assert.equal((await fetch(base + p)).status, 404);
    assert.equal(
      (await fetch(base + "/biziva/app.mjs", { method: "POST" })).status,
      405
    );
  } finally {
    await new Promise(r => server.close(r));
  }
});
import { parseCSV, clean, toCSV, process } from "./logic.mjs";
test("CSV parses quotes, embedded newlines, BOM and trailing empty cells", () => {
  const r = parseCSV(
    '\uFEFFname,note,phone\r\n"Studio, Dallas","a\nb",0012\r\nJoão,"a""b",'
  );
  assert.deepEqual(r, [
    { name: "Studio, Dallas", note: "a\nb", phone: "0012" },
    { name: "João", note: 'a"b', phone: "" }
  ]);
});
test("deduplicates normalized rows and guards spreadsheet formulas", () => {
  const r = clean([
    { a: " x ", phone: "0012" },
    { phone: "0012", a: "x" }
  ]);
  assert.equal(r.removed, 1);
  assert.equal(r.rows[0].phone, "0012");
  const csv = toCSV([{ name: '  =HYPERLINK("x")', safe: "a,b" }]);
  assert.ok(csv.includes("'  =HYPERLINK"));
  assert.deepEqual(parseCSV(toCSV([{ a: "a,b", b: "line\nnext" }])), [
    { a: "a,b", b: "line\nnext" }
  ]);
});
test("rejects duplicate headers, unclosed quotes, irregular rows and invalid modes", async () => {
  for (const text of ["a,a\n1,2", 'a,b\n"open', "a,b\n1,2,3"])
    assert.throws(() => parseCSV(text));
  await assert.rejects(process({ source: "[]", mode: "eval" }));
  assert.throws(() => clean([null]));
});
