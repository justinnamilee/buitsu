import sqlite3 from "sqlite3";

export default class buitsudb {
  c;
  db;
  path;
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
      this.path = process.env.database_path || this.c.path;
      this.db = new sqlite3.Database(this.path);
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
      console.warn(this.c.ui.closed);
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
  userFind(user, cb, calls) {
    if (typeof calls === "undefined" || calls < 5) {
      this.db.get(
        this.c.query.user.find,
        this.mapParams("find", user),
        (err, row) => {
          if (err) {
            cb(err, null);
          }
          else if (typeof row === "undefined") {
            this.db.run(
              this.c.query.user.create,
              this.mapParams("create", user),
              (err) => {
                if (err) {
                  cb(err, null);
                }
                else {
                  console.log(this.c.ui.create);
                  this.userFind(user, cb, calls ? (calls + 1) : 1);
                }
              });
          }
          else {
            console.log(this.c.ui.find + row.rowid);
            cb(null, { ...user, rowid: row.rowid });
          }
        });
    }
    else {
      console.error(this.c.ui.recursionFail);
      //TODO add error object
      cb(null, null);
    }
  }

  userUpdate(user) {
    this.db.run(
      this.c.query.user.update,
      this.mapParams("update", user),
      (err) => {
        if (err) {
          console.error(c.ui.updateFail + err.message);
        }
        else {
          console.log(c.ui.updateSuccess);
        }
      });
  }

  //! map data objects by query
  mapParams(query, data) {
    const param = new Array(this.c.map[query].length);

    for (const [i, p] of this.c.map[query].entries()) {
      param[i] = data[p];
    }

    return param;
  }
}
