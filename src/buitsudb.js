import sqlite3 from 'sqlite3';

export default class buitsudb {
  config;
  db;
  state = false;

  constructor(config) {
    this.config = config;
  }

  open() {
    if (this.state) {
      console.warn(this.config.ui.open);
    }
    else {
      this.db = new sqlite3.Database(
        this.config.path,
        (err) => {
          if (err) {
            console.error(this.config.ui.error + err.message);
          }
          else {
            this.state = true;
          }
        });
    }
  }

  close() {
    this.db.close();
  }

  setup() {
    console.log("hi");
  }
}