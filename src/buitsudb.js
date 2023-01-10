import sqlite3 from 'sqlite3';

export default class buitsudb {
  c;
  db;
  opened = false;

  constructor(config) {
    this.c = config;
  }


  //! open & shut case
  open() {
    if (this.opened) {
      console.warn(this.c.ui.opened);
    }
    else {
      this.db = new sqlite3.Database(this.c.path);
      this.opened = true;
      console.log(this.c.ui.open);
    }
  }

  close() {
    if (this.opened) {
      this.db.close();
      this.opened = false;
      console.log(this.c.ui.close);
    }
    else {
      console.log(this.c.ui.closed);
    }
  }


  //! setup adds tables if required
  setup() {
    this.db.serialize(() => {
      this.db.run(this.c.query.setup.user);
      this.db.run(this.c.query.setup.index);
      this.db.run(this.c.query.setup.game);
      this.db.run(this.c.query.setup.score);
    });

    console.log(this.c.ui.setup);
  }


  //! user shit
  find(user, cb, calls) {
    if (typeof calls === "undefined" || calls < 5) {
      this.db.get(
        this.c.query.user.find,
        [user.id],
        (err, row) => {
          if (err) {
            cb(err, null);
          }
          else {
            if (typeof row !== "undefined") {
              console.log(this.c.ui.find + row.rowid);
              cb(null, row.rowid);
            }
            else {
              this.db.run(
                this.c.query.user.create,
                [user.displayName, user.id, user.emails[0].value],
                (err) => {
                  if (err) {
                    cb(err, null);
                  }
                  else {
                    console.log(this.c.ui.create);
                    this.find(user, cb, calls ? (calls + 1) : 1);
                  }
                });
            }
          }
        });
    }
    else {
      console.error(this.c.ui.recursion);
      //! add error object
      cb(null, null);
    }
  }
}
