#!/usr/bin/env node
/*
 * Royal Paan print agent — runs on the shop laptop.
 *
 * Polls the website for print jobs and sends them as ESC/POS bytes over raw
 * TCP to the Epson TM-U220 on the shop LAN. Node.js 18+, no npm packages.
 *
 *   node agent.js           run forever
 *   node agent.js --test    print a test slip straight to the printer and exit
 *   DRY_RUN=yes             show a text preview instead of printing
 */
"use strict";

const net = require("net");

// ---------------------------------------------------------------- config

const env = process.env;
const CONFIG = {
  serverUrl: (env.SERVER_URL || "http://localhost:3000").trim().replace(/\/+$/, ""),
  agentKey: (env.PRINT_AGENT_KEY || "").trim(),
  printerIp: (env.PRINTER_IP || "192.168.192.168").trim(),
  printerPort: Number(env.PRINTER_PORT) || 9100,
  columns: Number(env.PRINTER_COLUMNS) || 40,
  cutter: String(env.PRINTER_CUTTER || "yes").trim().toLowerCase() !== "no",
  shopName: env.SHOP_NAME || "Royal Paan Family Restaurant",
  dryRun: String(env.DRY_RUN || "").trim().toLowerCase() === "yes",
  pollMs: 2000,
  retryDelayMs: 5000,
};
const COLS = CONFIG.columns;

function log(msg) {
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  console.log(`[${time}] ${msg}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- text helpers

/** Printable ASCII only (the TM-U220 has no Hindi or rupee glyphs). Spaces are kept as-is. */
function toAscii(value) {
  return String(value == null ? "" : value)
    .replace(/₹/g, "Rs.")
    .replace(/[×✕]/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, "");
}

/** Word-wrap to `width`, hard-splitting words that are longer than a line. */
function wrap(text, width) {
  const out = [];
  for (const para of toAscii(text).split("\n")) {
    let line = "";
    for (let word of para.split(" ").filter(Boolean)) {
      while (word.length > width) {
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (!word) continue;
      if (!line) line = word;
      else if (line.length + 1 + word.length <= width) line += " " + word;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Left text and right-aligned right text on one line, or two lines if they don't fit. */
function twoCol(left, right, width = COLS) {
  left = toAscii(left);
  right = toAscii(right);
  if (left.length + 1 + right.length <= width) {
    return left + " ".repeat(width - left.length - right.length) + right;
  }
  return left + "\n" + right.padStart(width);
}

const num = (v) => Number(v) || 0;
const money = (n) => num(n).toFixed(2);
const pad4 = (n) => String(n == null ? "" : n).padStart(4, "0");

function formatDate(value) {
  const d = value == null || value === "" ? new Date() : new Date(value);
  return (isNaN(d.getTime()) ? new Date() : d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------- ESC/POS

const ESC = 0x1b;
const GS = 0x1d;
const SIZE = { normal: 0x00, tall: 0x10, wide: 0x20, double: 0x30 };
const ALIGN = { left: 0, center: 1, right: 2 };

class Receipt {
  constructor() {
    this.parts = [];
    this.raw(ESC, 0x40); // ESC @ init
  }
  raw(...bytes) {
    this.parts.push(Buffer.from(bytes));
    return this;
  }
  text(s) {
    this.parts.push(Buffer.from(toAscii(s), "ascii"));
    return this;
  }
  line(s = "") {
    return this.text(s + "\n");
  }
  align(where) {
    return this.raw(ESC, 0x61, ALIGN[where] ?? 0);
  }
  bold(on) {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }
  size(mode) {
    return this.raw(ESC, 0x21, SIZE[mode] ?? 0);
  }
  divider(char = "-") {
    return this.line(char.repeat(COLS));
  }
  finish() {
    this.raw(ESC, 0x64, 5); // feed 5 lines
    if (CONFIG.cutter) this.raw(GS, 0x56, 1); // partial cut
    return Buffer.concat(this.parts);
  }
}

// ---------------------------------------------------------------- layouts

function renderKot(d) {
  const r = new Receipt();
  r.align("center").size("normal").line(CONFIG.shopName);
  r.size("double").bold(true).line("KITCHEN ORDER").size("normal").bold(false);
  r.align("left").divider();
  r.line(twoCol("KOT #" + pad4(d.kotNo), formatDate(d.createdAt)));
  r.size("tall").bold(true).line("Table: " + toAscii(d.table)).size("normal").bold(false);
  r.line("Staff: " + toAscii(d.staff));
  r.divider();

  const items = Array.isArray(d.items) ? d.items : [];
  let count = 0;
  for (const it of items) {
    count += num(it.qty);
    const qty = `${num(it.qty)} x `.padEnd(5);
    const name = toAscii(it.name) + (it.variant ? " - " + toAscii(it.variant) : "");
    r.size("tall").bold(true);
    wrap(name, COLS - 5).forEach((l, i) => r.line((i === 0 ? qty : " ".repeat(5)) + l));
    r.size("normal").bold(false);
    if (it.note) wrap("* " + toAscii(it.note), COLS - 5).forEach((l) => r.line(" ".repeat(5) + l));
  }
  r.divider();
  if (d.note) {
    wrap("Note: " + toAscii(d.note), COLS).forEach((l) => r.line(l));
    r.divider();
  }
  r.align("center").line(`${count} ${count === 1 ? "item" : "items"}`);
  return r.finish();
}

function renderBill(d) {
  const r = new Receipt();
  r.align("center").size("double").bold(true).line("ROYAL PAAN").size("normal").bold(false);
  r.line(CONFIG.shopName);
  r.align("left").divider();
  r.line(twoCol("Bill #" + pad4(d.billNo), formatDate(d.createdAt)));
  r.line(twoCol("Table: " + toAscii(d.table), "Staff: " + toAscii(d.staff)));
  r.divider();

  const nameWidth = COLS - 14;
  r.bold(true).line("Item".padEnd(nameWidth) + "Qty".padStart(4) + "Amount".padStart(10)).bold(false);
  r.divider();

  const items = Array.isArray(d.items) ? d.items : [];
  let computed = 0;
  for (const it of items) {
    const qty = num(it.qty);
    const amount = it.amount != null ? num(it.amount) : qty * num(it.price);
    computed += amount;
    const name = toAscii(it.name) + (it.variant ? " - " + toAscii(it.variant) : "");
    wrap(name, nameWidth - 1).forEach((l, i) => {
      r.line(i === 0 ? l.padEnd(nameWidth) + String(qty).padStart(4) + money(amount).padStart(10) : l);
    });
  }
  r.divider();

  const subtotal = d.subtotal != null ? num(d.subtotal) : computed;
  const discount = num(d.discount);
  const taxes = Array.isArray(d.taxes) ? d.taxes : [];
  const taxTotal = taxes.reduce((s, t) => s + num(t.amount), 0);
  const total = d.total != null ? num(d.total) : subtotal - discount + taxTotal;

  r.line(twoCol("Subtotal", money(subtotal)));
  if (discount) r.line(twoCol("Discount", "-" + money(discount)));
  for (const t of taxes) r.line(twoCol(t.label || "Tax", money(t.amount)));
  r.divider("=");
  r.size("tall").bold(true).line(twoCol("TOTAL", "Rs. " + money(total))).size("normal").bold(false);
  r.divider("=");
  if (d.paymentMode) r.line("Payment: " + toAscii(d.paymentMode));
  r.line();
  r.align("center").line("Thank you! Visit again");
  return r.finish();
}

function renderTest() {
  const r = new Receipt();
  r.align("center").size("double").bold(true).line("TEST PRINT").size("normal").bold(false);
  r.line(CONFIG.shopName);
  r.align("left").divider();
  r.line(`Printer: ${CONFIG.printerIp}:${CONFIG.printerPort}`);
  r.line("Time: " + formatDate(Date.now()));
  r.line("1234567890".repeat(Math.ceil(COLS / 10)).slice(0, COLS));
  r.align("center").line("Agent sahi chal raha hai");
  return r.finish();
}

function render(job) {
  const data = job.data && typeof job.data === "object" ? job.data : {};
  if (job.type === "kot") return renderKot(data);
  if (job.type === "bill") return renderBill(data);
  if (job.type === "test") return renderTest();
  throw new Error("Unknown job type: " + job.type);
}

// ---------------------------------------------------------------- output

function dryRunPreview(buf) {
  const text = buf
    .toString("latin1")
    .replace(/\x1b@/g, "")
    .replace(/\x1b[aE!d][\s\S]/g, "")
    .replace(/\x1dV[\s\S]/g, "");
  console.log("\n==================== DRY RUN ====================");
  console.log(text.replace(/\n+$/, ""));
  console.log("=================================================\n");
}

function sendToPrinter(buf) {
  if (CONFIG.dryRun) {
    dryRunPreview(buf);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = net.createConnection({ host: CONFIG.printerIp, port: CONFIG.printerPort });
    const finish = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(new Error("Printer error: " + (err.code || err.message)));
      else resolve();
    };
    socket.setTimeout(10000);
    socket.on("connect", () => socket.end(buf, () => finish()));
    socket.on("timeout", () => finish({ code: "ETIMEDOUT" }));
    socket.on("error", finish);
  });
}

// ---------------------------------------------------------------- server loop

function api(path, options = {}) {
  return fetch(CONFIG.serverUrl + "/api/print-jobs" + path, {
    ...options,
    headers: { "x-agent-key": CONFIG.agentKey, "Content-Type": "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
}

function describeError(e) {
  const cause = e && e.cause;
  const extra = cause ? ` (${cause.code || cause.message})` : "";
  return (e && e.message ? e.message : String(e)) + extra;
}

/** Print one job. Returns true if a job printed OK. */
async function processOne() {
  const res = await api("/next");
  if (res.status === 204) return false;
  if (!res.ok) {
    const hint = res.status === 401 ? " – PRINT_AGENT_KEY galat hai?" : "";
    throw new Error(`Server ne ${res.status} diya${hint}`);
  }
  const job = await res.json();
  const label = String(job.type || "job").toUpperCase();

  let ok = true;
  let error = null;
  try {
    await sendToPrinter(render(job));
    log(`Printed ${label} (${String(job.id).slice(0, 8)})`);
  } catch (e) {
    ok = false;
    error = e && e.message ? e.message : String(e);
    log(`FAIL ${label}: ${error}`);
  }

  try {
    const done = await api(`/${job.id}/done`, { method: "POST", body: JSON.stringify({ ok, error }) });
    if (!done.ok) log(`Result server ko nahi bheja: status ${done.status}`);
  } catch (e) {
    log("Result server ko nahi bheja: " + describeError(e));
  }
  return ok;
}

async function main() {
  if (typeof fetch !== "function") {
    console.error("Node.js 18 ya naya version chahiye (fetch nahi mila).");
    process.exit(1);
  }

  if (process.argv.includes("--test")) {
    try {
      await sendToPrinter(renderTest());
      log(CONFIG.dryRun ? "Test slip preview upar hai (DRY RUN)" : "Test slip printer ko bhej di");
      process.exit(0);
    } catch (e) {
      log("Test slip FAIL: " + e.message);
      process.exit(1);
    }
  }

  if (!CONFIG.agentKey) {
    console.error("PRINT_AGENT_KEY set nahi hai. start-agent.bat mein wahi key daalo jo server ki .env.local mein hai.");
    process.exit(1);
  }

  const target = CONFIG.dryRun ? "DRY RUN" : `${CONFIG.printerIp}:${CONFIG.printerPort}`;
  log(`Agent chalu – server: ${CONFIG.serverUrl}, printer: ${target}`);

  let lastError = null;
  for (;;) {
    try {
      const printed = await processOne();
      if (lastError) log("Server se connection theek hai");
      lastError = null;
      if (!printed) await sleep(CONFIG.pollMs);
    } catch (e) {
      const msg = describeError(e);
      if (msg !== lastError) log("Error: " + msg);
      lastError = msg;
      await sleep(CONFIG.retryDelayMs);
    }
  }
}

main();
