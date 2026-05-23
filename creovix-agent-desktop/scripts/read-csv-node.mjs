/**
 * Node helper using csv-parser (Pass 1 utility).
 * Usage: node scripts/read-csv-node.mjs path/to/file.csv
 */
import fs from "node:fs";
import csv from "csv-parser";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/read-csv-node.mjs <csv-path>");
  process.exit(1);
}

const rows = [];
fs.createReadStream(filePath)
  .pipe(csv())
  .on("data", (row) => rows.push(row))
  .on("end", () => {
    console.log(JSON.stringify(rows, null, 2));
  })
  .on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
