import express from "express";
import passport from "passport";
import fs from "fs";
import path from "path";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import expressSession from "express-session";


// passport normalizing function(s)
function normalizeObject(input) {
  if (input && "provider" in input) {
    switch (input.provider) {
      case "google":
        return normalizeGObject(input);
      case "facebook":
        return normalizeFObject(input);
    }
  }

  return null;
}

function normalizeGObject(input) {
  //? Google special handler
  if (process.env.debug) {
    console.log(input);
  }

  const output = {};

  output.name = input.displayName;
  output.id = input.id;
  output.email = input.emails[0].value;

  output.raw = input;
  output.type = "GObject";

  return output;
}

function normalizeFObject(input) {
  //? Facebook special handler
  if (process.env.debug) {
    console.log(input);
  }

  const output = {};

  output.name = input.displayName;
  output.id = input.id;
  output.email = input.emails[0].value;

  output.raw = input;
  output.type = "FObject";

  return output;
}


export default class buitsuexpress {
  app;
  c;
  db;
  port;
  running = false;
  server;

  constructor(config, db) {
    this.c = config;
    this.db = db;

    //! passport
    passport.serializeUser((user, cb) => { this.db.userFind(normalizeObject(user), cb) });
    passport.deserializeUser((user, cb) => { cb(null, user) });

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.google_id,
          clientSecret: process.env.google_secret,
          callbackURL: this.c.url.loginGoogleCallback,
        },
        (accessToken, refreshToken, user, done) => {
          return done(null, user);
        }));

    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.facebook_id,
          clientSecret: process.env.facebook_secret,
          profileFields: ["id", "email", "displayName"],
          callbackURL: this.c.url.loginFacebookCallback
        },
        (accessToken, refreshToken, user, done) => {
          return done(null, user);
        }));


    //! express
    this.app = express();
    this.port = process.env.express_port || this.c.port;

    this.app.set("view engine", "ejs");
    this.app.use(express.static(process.env.express_static || this.c.static));

    this.app.use(
      //? handle safe shutdown
      (req, res, next) => {
        if (this.running) {
          return next();
        }

        res.setHeader("Connection", "close");
        res.send(503, this.c.ui.shutdown);
      });

    this.app.use(expressSession({ secret: process.env.express_session_secret, resave: false, saveUninitialized: true, proxy: true }));
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // the basics
    this.app.get(
      this.c.route.root,
      (req, res) => { res.render(this.c.view.page.index, { data: req.user, meta: this.c }) });

    this.app.get(
      this.c.route.about,
      (req, res) => { res.render(this.c.view.page.about, { data: req.user, meta: this.c }) });

    //this.app.get(
    //  "/success",
    //  (req, res, next) => { if (req.user) { next() } else { res.sendStatus(401) } }, //? auth middle man example
    //  (req, res) => { res.json({ message: "Successfully logged in.", user: req.user }) });

    // misc login methods
    this.app.get(
      this.c.route.logoutCallback,
      (req, res) => res.redirect(this.c.route.root))

    this.app.post(
      this.c.route.logout,
      (req, res, next) => req.logout((err) => { if (err) { return next(err) } res.json(this.c.route.logoutCallback) }));

    this.app.get(
      this.c.route.loginFailed,
      (req, res) => { res.json({ message: this.c.ui.loginFailed }) });

    // facebuuk loginz!
    this.app.get(
      this.c.route.loginFacebook,
      passport.authenticate("facebook", { scope: ["email", "public_profile"] }));

    this.app.get(
      this.c.route.loginFacebookCallback,
      passport.authenticate("facebook", { failureRedirect: this.c.route.loginFailed, successRedirect: this.c.route.root }));

    // googly loginz!
    this.app.get(
      this.c.route.loginGoogle,
      passport.authenticate("google", { scope: ["email", "profile"] }));

    this.app.get(
      this.c.route.loginGoogleCallback,
      passport.authenticate("google", { failureRedirect: this.c.route.loginFailed, successRedirect: this.c.route.root }));

    // games!!
    this.app.get(
      this.c.route.games,
      (req, res) => {
        if (req.user) {
          res.render(this.c.view.page.games, { data: req.user, meta: this.c });
        }
        else {
          res.redirect(this.c.route.root);
        }
      });

    this.app.get(
      this.c.route.game,
      (req, res) => {
        if (req.user) {
          if (process.env.debug) {
            console.log(req.params.name);
          }

          // make sure we have a game, and make sure it's in approved list
          if (req.params && "name" in req.params && this.c.game.includes(req.params.name)) {
            res.render(this.c.view.page.game, { data: req.user, meta: this.c, game: req.params.name });
          }
          else {
            res.redirect(this.c.route.games);
          }
        }
        else {
          res.redirect(this.c.route.root);
        }
      });
  }

  close(err, done) {
    this.running = false;

    this.server.close(() => { console.log(c.ui.shutdownSuccess); done() });

    setTimeout(
      () => { console.log(this.c.ui.shutdownFail); err() },
      (process.env.express_grace || this.c.grace) * 1000);
  }

  open() {
    this.server = this.app.listen(
      this.port,
      setTimeout(
        () => {
          this.running = true; console.log(this.c.ui.startup + this.port)
        },
        (process.env.express_startup || this.c.startup) * 1000));
  }
}
