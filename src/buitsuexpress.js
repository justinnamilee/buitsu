import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import expressSession from "express-session";

// passport normalizing function(s)
function normalizeGObject(input) {
  //? Google
  const output = {};

  output.name = input.displayName;
  output.id = input.id;
  output.email = input.emails[0].value;

  output.raw = input;
  output.type = "GObject";

  return output;
}

function normalizeFObject(input) {
  //? Facebook
  const output = {};
  //TODO add support for this guy eventually
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
    passport.serializeUser((user, cb) => { this.db.userFind(normalizeGObject(user), cb) }); //? save to session
    passport.deserializeUser((user, cb) => { cb(null, user) }); //? retrieve for request

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.google_id,
          clientSecret: process.env.google_secret,
          callbackURL: this.c.route.loginGoogleCallbackUrl,
          passReqToCallback: true
        },
        (request, accessToken, refreshToken, user, done) => {
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
    this.app.get(this.c.route.root, (req, res) => { res.render("pages/index", { data: req.user }) });
    this.app.get(this.c.route.about, (req, res) => { res.render("pages/about", { data: req.user }) });
    //this.app.get("/success", (req, res, next) => { if (req.user) { next() } else { res.sendStatus(401) } }, (req, res) => { res.json({ message: "Successfully logged in.", user: req.user }) });

    // login methods
    this.app.post(this.c.route.logout, (req, res, next) => req.logout((err) => { if (err) { return next(err) } res.redirect("/") }));
    this.app.get(this.c.route.loginFailed, (req, res) => { res.json({ message: this.c.ui.loginFailed }) });

    this.app.get(this.c.route.loginGoogle, passport.authenticate("google", { scope: ["email", "profile"] }));
    this.app.get(this.c.route.loginGoogleCallback, passport.authenticate("google", { failureRedirect: this.c.route.loginFailed, successRedirect: this.c.route.root }));

    // games!!
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

  close(err, done) {
    this.running = false;

    this.server.close(() => { console.log(c.ui.shutdownSuccess); done() });

    setTimeout(
      () => { console.log(this.c.ui.shutdownFail); err() },
      (process.env.express_grace || this.c.grace) * 1000);
  }
}