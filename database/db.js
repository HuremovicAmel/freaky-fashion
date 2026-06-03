const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/database.db');

db.serialize(() => {

    db.run(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        image TEXT
    )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            image TEXT,
            published_at DATE,
            category_id INTEGER,
            is_popular INTEGER DEFAULT 0,

            FOREIGN KEY(category_id)
            REFERENCES categories(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            password TEXT,
            admin INTEGER DEFAULT 0
        )
    `);

});

module.exports = db;