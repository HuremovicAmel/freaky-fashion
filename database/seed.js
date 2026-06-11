const db = require('./db');

db.serialize(() => {

    db.run(`DELETE FROM products`);
    db.run(`DELETE FROM categories`);
    db.run(`DELETE FROM users`);
    db.run(`DELETE FROM favorites`);

    db.run(`DELETE FROM sqlite_sequence WHERE name='products'`);
    db.run(`DELETE FROM sqlite_sequence WHERE name='categories'`);
    db.run(`DELETE FROM sqlite_sequence WHERE name='users'`);
    db.run(`DELETE FROM sqlite_sequence WHERE name='favorites'`);

    db.run(`
        INSERT INTO categories
        (name, slug, image)
        VALUES
        ('Kläder', 'klader', '/images/categories/klader.jpg'),
        ('Accessoarer', 'accessoarer', '/images/categories/accessoarer.jpg'),
        ('Skor', 'skor', '/images/categories/skor.jpg')
    `);

    db.run(`
        INSERT INTO products
        (name, slug, description, price, image, published_at, category_id, is_popular)
        VALUES
        ('Svart T-shirt', 'svart-tshirt', 'En stilren svart t-shirt.', 199, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 1, 1),

        ('Vit T-shirt', 'vit-tshirt', 'En klassisk vit t-shirt.', 199, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 1, 1),

        ('Hoodie', 'hoodie', 'En bekväm hoodie.', 499, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 1, 1),

        ('Jeans', 'jeans', 'Blå jeans med modern passform.', 699, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 1, 1),

        ('Sneakers', 'sneakers', 'Bekväma sneakers.', 899, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 2, 1),

        ('Keps', 'keps', 'Svart keps med logga.', 149, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 3, 1),

        ('Jacka', 'jacka', 'Lätt jacka för vardag.', 999, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 1, 1),

        ('Ryggsäck', 'ryggsack', 'Praktisk ryggsäck.', 399, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now'), 3, 1),

        ('Framtida produkt', 'framtida-produkt', 'Ska inte visas ännu.', 999, 'https://placehold.co/600x400?text=Freaky+Fashion', DATE('now', '+10 days'), 1, 1)
    `);

    db.run(`
        INSERT INTO users
        (email, password, admin)
        VALUES
        ('admin@freakyfashion.com', '123456', 1)
    `);

});

console.log('Seed data inserted');