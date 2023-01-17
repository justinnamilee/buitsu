import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";


//! project specific
import buitsudb from "./src/buitsudb.js";
import buitsuexpress from "./src/buitsuexpress.js";


//! dotenv + config
//? entries in dotenv override config where applicable
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __config = path.join(__dirname, (process.env.buitsu_config || "private/config.yml"));

if (!fs.existsSync(__config)) {
  console.error(`Config "${__config}" must exist!`);
  process.exit(1);
}

const c = yaml.parse(fs.readFileSync(__config, "utf8"));


//! open/setup DB
const db = new buitsudb(c.database);

db.open();
db.setup();

//! open express!
const server = new buitsuexpress(c.express, db);
server.open();


//! cleanup
function shutdown() {
  //? make sure we treat the DB nicely... >_>
  db.close();

  server.close(() => process.exit(1), () => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
