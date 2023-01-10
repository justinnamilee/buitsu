import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import expressSession from 'express-session';


//! project specific
import buitsudb from './src/buitsudb.js';


//! dotenv + config
//? entries in dotenv override config where applicable
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __config = path.join(__dirname, (process.env.config || 'private/config.yml'));

if (!fs.existsSync(__config)) {
  console.error(`Config '${__config}' must exist!`);
  process.exit(1);
}

const c = yaml.parse(fs.readFileSync(__config, 'utf8'));


//! open/setup DB
const db = new buitsudb(c.database);

db.open();
db.setup();

//! passport
passport.serializeUser((user, cb) => { db.find(user, cb) }); //? save to session
passport.deserializeUser((user, cb) => { cb(null, user) }); //? retrieve for request

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.id,
      clientSecret: process.env.secret,
      callbackURL: c.passport.callbackUrl,
      passReqToCallback: true
    },
    (request, accessToken, refreshToken, user, done) => {
      return done(null, user);
    }));


//! express
const app = express();
const port = process.env.port || c.express.port || 3111;
let running = false;

app.use(
  //? handle safe shutdown
  (req, res, next) => {
    if (running) {
      return next();
    }

    res.setHeader('Connection', 'close');
    res.send(503, c.express.ui.shutdown);
  });

app.use(expressSession({ secret: process.env.session, resave: false, saveUninitialized: true, proxy: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => { res.json({ message: "Whatchu want?" }) });
app.get("/failed", (req, res) => { res.json({ message: "Failed to log in." }) });
app.get("/success", (req, res, next) => { if (req.user) { next() } else { res.sendStatus(401) } }, (req, res) => { res.json({ message: "Successfully logged in.", user: req.user }) });

app.get("/login", passport.authenticate("google", { scope: ["email", "profile"] }));
app.get("/login/return", passport.authenticate("google", { failureRedirect: "/failed", successRedirect: "/success" }));

const server = app.listen(
  port,
  setTimeout(
    () => {
      running = true; console.log(c.express.ui.startup + port)
    },
    c.express.startup * 1000));


//! cleanup
function shutdown() {
  running = false;

  //? make sure we treat the DB nicely... >_>
  db.close();

  server.close(
    () => {
      console.log(c.express.ui.shutdownSuccess);
      process.exit(0);
    });

  setTimeout(
    () => {
      console.log(c.express.ui.shutdownFail);
      process.exit(1);
    },
    (process.env.grace || c.express.grace) * 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
