import sqlite3 from 'sqlite3';

export default class buitsudb {
  config;
  db;
  opened = false;

  constructor(config) {
    this.config = config;
  }

  open() {
    if (!this.opened) {
      this.db = new sqlite3.Database(this.config.path);
      this.opened = true;
    }
  }

  close() {
    this.db.close();
    this.opened = false;
  }

  setup() {
    this.open();
    this.db.run(this.config.query.setup);
    this.close();
  }

  run(query) {
    this.open();
    this.db.run(query);
    this.close();
  }
}