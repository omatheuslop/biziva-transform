import { process } from "./logic.mjs";
const config = JSON.parse(document.getElementById("config").textContent);
const fields = document.getElementById("fields"),
  controls = new Map();
let current = null,
  previewURL = null,
  revision = 0;
function el(tag, props = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k in n) n[k] = v;
    else n.setAttribute(k, v);
  }
  if (text !== undefined) n.textContent = text;
  return n;
}
for (const [name, title, type, value] of config.fields) {
  const label = el("label", { htmlFor: name }, title);
  let node;
  if (type === "select") {
    node = el("select", { id: name, name });
    for (const [v, t] of value) node.append(el("option", { value: v }, t));
  } else if (type === "textarea")
    node = el("textarea", {
      id: name,
      name,
      value,
      maxLength: 1048576,
      spellcheck: false
    });
  else
    node = el("input", {
      id: name,
      name,
      type,
      ...(type === "checkbox"
        ? { checked: value }
        : type === "file"
          ? { multiple: true }
          : { value })
    });
  if (type === "checkbox") label.className = "check";
  label.append(node);
  fields.append(label);
  controls.set(name, node);
}
const output = document.getElementById("output"),
  status = document.getElementById("status"),
  preview = document.getElementById("preview"),
  download = document.getElementById("download"),
  png = document.getElementById("png"),
  run = document.getElementById("run");
run.textContent = config.action;
function clearResult() {
  revision++;
  current = null;
  output.textContent = "O resultado aparecerá aqui após sua revisão.";
  download.disabled = true;
  png.hidden = true;
  preview.hidden = true;
  preview.style.display = "none";
  if (previewURL) {
    URL.revokeObjectURL(previewURL);
    previewURL = null;
  }
  status.textContent = "";
  status.classList.remove("error");
}
function values() {
  return Object.fromEntries(
    [...controls]
      .filter(([, n]) => n.type !== "file")
      .map(([k, n]) => [k, n.type === "checkbox" ? n.checked : n.value])
  );
}
function save(text, name, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
fields.addEventListener("input", clearResult);
fields.addEventListener("change", clearResult);
document.getElementById("form").addEventListener("submit", async e => {
  e.preventDefault();
  clearResult();
  run.disabled = true;
  const runRevision = revision;
  status.textContent = "Processando localmente…";
  try {
    const result = await process(
      values(),
      Array.from(controls.get("files")?.files || [])
    );
    if (runRevision !== revision) {
      status.textContent = "A entrada mudou. Execute novamente.";
      return;
    }
    current = result;
    output.textContent = current.text;
    status.textContent = current.summary;
    download.disabled = false;
    if (current.visual) {
      previewURL = URL.createObjectURL(
        new Blob([current.visual], { type: "image/svg+xml" })
      );
      preview.src = previewURL;
      preview.hidden = false;
      preview.style.display = "block";
      png.hidden = false;
    }
  } catch (error) {
    clearResult();
    status.classList.add("error");
    status.textContent =
      error instanceof Error ? error.message : "Não foi possível processar.";
  } finally {
    run.disabled = false;
  }
});
download.addEventListener("click", () => {
  if (current) save(current.text, current.filename, current.mime);
});
png.addEventListener("click", async () => {
  if (!current?.visual || !previewURL) return;
  png.disabled = true;
  const pngRevision = revision;
  try {
    const image = new Image();
    image.src = previewURL;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas indisponível");
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw Error("PNG não pôde ser criado");
    if (pngRevision === revision) save(blob, "card-biziva.png", "image/png");
  } catch {
    status.textContent =
      "Não foi possível exportar PNG. O SVG continua disponível.";
  } finally {
    png.disabled = false;
  }
});
document
  .getElementById("save-project")
  .addEventListener("click", () =>
    save(
      JSON.stringify(
        { format: "biziva-" + config.id, version: 1, inputs: values() },
        null,
        2
      ),
      "projeto-" + config.id + ".json",
      "application/json"
    )
  );
const restore = document.getElementById("restore-file");
document
  .getElementById("restore")
  .addEventListener("click", () => restore.click());
restore.addEventListener("change", async () => {
  try {
    const f = restore.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) throw Error("Projeto deve ter até 3 MiB.");
    const p = JSON.parse(await f.text());
    if (
      p.format !== "biziva-" + config.id ||
      p.version !== 1 ||
      !p.inputs ||
      typeof p.inputs !== "object" ||
      Array.isArray(p.inputs)
    )
      throw Error("Projeto de outro produto ou formato inválido.");
    const staged = [];
    for (const [k, n] of controls) {
      if (n.type === "file") continue;
      const v = p.inputs[k];
      if (n.type === "checkbox") {
        if (typeof v !== "boolean") throw Error("Campo inválido: " + k);
      } else if (
        typeof v !== "string" ||
        v.length > 1048576 ||
        (n.tagName === "SELECT" && ![...n.options].some(o => o.value === v))
      )
        throw Error("Campo inválido: " + k);
      staged.push([n, v]);
    }
    clearResult();
    for (const [, n] of controls) {
      if (n.type === "file") n.value = "";
    }
    for (const [n, v] of staged)
      n.type === "checkbox" ? (n.checked = v) : (n.value = v);
    status.textContent =
      "Entrada restaurada. Arquivos precisam ser escolhidos novamente; clique em processar para conferir.";
  } catch (error) {
    clearResult();
    status.classList.add("error");
    status.textContent = error.message;
  } finally {
    restore.value = "";
  }
});
document.getElementById("clear").addEventListener("click", () => {
  for (const [, n] of controls) {
    if (n.type === "checkbox") n.checked = false;
    else if (n.tagName !== "SELECT" && n.type !== "color") n.value = "";
  }
  clearResult();
});
