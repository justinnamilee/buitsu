import * as dotenv from 'dotenv';
import b from './src/db.js';

dotenv.config();
//console.log(process.env.goa2_client_id);
//console.log(process.env.goa2_client_secret);

db.setup();
