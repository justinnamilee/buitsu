import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import expressSession from 'express-session';

export default class buitsuexpress {
  c;
  db;
  running = false;
  server;

  constructor(config, db) {
    this.c = config;
    this.db = db;
  
    //! passport
    passport.serializeUser((user, cb) => { this.db.userFind(user, cb) }); //? save to session
    passport.deserializeUser((user, cb) => { cb(null, user) }); //? retrieve for request

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.google_id,
          clientSecret: process.env.google_secret,
          callbackURL: (process.env.google_callbackurl || this.c.passport.googleCallbackUrl),
          passReqToCallback: true
        },
        (request, accessToken, refreshToken, user, done) => {
          return done(null, user);
        }));


    //! express
    const app = express();
    const port = process.env.express_port || this.c.port;
    let running = false;

    app.set('view engine', 'ejs');
    app.use(express.static(process.env.express_static || this.c.static));

    app.use(
      //? handle safe shutdown
      (req, res, next) => {
        if (this.running) {
          return next();
        }

        res.setHeader('Connection', 'close');
        res.send(503, this.c.ui.shutdown);
      });

    app.use(expressSession({ secret: process.env.express_session_secret, resave: false, saveUninitialized: true, proxy: true }));
    app.use(passport.initialize());
    app.use(passport.session());

    app.get("/", (req, res) => { res.json({ message: "Whatchu want?" }) });
    app.get("/failed", (req, res) => { res.json({ message: "Failed to log in." }) });
    app.get("/success", (req, res, next) => { if (req.user) { next() } else { res.sendStatus(401) } }, (req, res) => { res.json({ message: "Successfully logged in.", user: req.user }) });

    app.get("/login", passport.authenticate("google", { scope: ["email", "profile"] }));
    app.get("/login/return", passport.authenticate("google", { failureRedirect: "/failed", successRedirect: "/success" }));

    this.server = app.listen(
      port,
      setTimeout(
        () => {
          this.running = true; console.log(this.c.ui.startup + port)
        },
        (process.env.express_startup || this.c.startup) * 1000));
  }

  close(cb) {
    this.running = false;
    this.server.close(cb);
  }
}