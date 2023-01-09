import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import expressSession from 'express-session';


//! project specific
import buitsudb from './src/buitsudb.js';


//! dotenv + config
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __config = path.join(__dirname, (process.env.config || 'private/config.yml'));

if (!fs.existsSync(__config)) {
  console.error(`Config '${__config}' must exist!`);
  exit(1);
}

const c = yaml.parse(fs.readFileSync(__config, 'utf8'));


//! open/setup DB
const db = new buitsudb(c.database);

db.setup();


//! passport
passport.serializeUser((user, done) => { console.log("ser " + user); done(null, user) });
passport.deserializeUser((user, done) => { console.log("deser " + user); done(null, user) });

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.id,
      clientSecret: process.env.secret,
      callbackURL: c.passport.callbackUrl,
      passReqToCallback: true
    },
    (request, accessToken, refreshToken, profile, done) => {
      console.log("passport callback");
      return done(null, profile);
    }));


//! express
const app = express();
const port = c.express.port || process.env.port || 3111;

app.use(expressSession({ secret: process.env.session, resave: false, saveUninitialized: true, proxy: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => { res.json({ message: "You are not logged in." })});
app.get("/failed", (req, res) => { res.json({ message: "Failed to log in." })});
app.get("/success", (req, res, next) => { if (req.user) { next() } else { res.sendStatus(401) }}, (req, res) => { res.json({ message: "Successfully logged in." })});

app.get("/login", passport.authenticate("google", { scope: ["email", "profile"]}));
app.get("/login/return", passport.authenticate("google", { failureRedirect: "/failed", successRedirect: "/success" }));

app.listen(port, () => console.log("server up on " + port));
