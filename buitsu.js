import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

//! project specific
import buitsudb from './src/buitsudb.js';


//! dotenv + config
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __config = __dirname + (process.env.config || '/private/config.yml');

if (!fs.existsSync(__config)) {
  console.error(`Config '${__config}' must exist!`);
  exit(1);
}

const c = yaml.parse(fs.readFileSync(__config, 'utf8'));


//! open/setup DB
const db = new buitsudb(c.database);

db.open();
db.setup();
db.close();
