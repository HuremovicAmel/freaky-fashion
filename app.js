var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var multer = require('multer');
var fs = require('fs');
var db = require('./database/db');

var app = express();

var productsImageDir = path.join(__dirname, 'public/images/products');
var categoriesImageDir = path.join(__dirname, 'public/images/categories');

fs.mkdirSync(productsImageDir, { recursive: true });
fs.mkdirSync(categoriesImageDir, { recursive: true });

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'category-image') {
      cb(null, categoriesImageDir);
    } else {
      cb(null, productsImageDir);
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

var upload = multer({ storage: storage });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  secret: 'freaky-fashion-secret',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'public')));

function getFavoriteCount(req) {
  return (req.session.favorites || []).length;
}

function getCartCount(req) {
  return (req.session.cart || []).length;
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).send('You must be logged in');
  if (req.session.user.admin !== 1) return res.status(403).send('Access denied');
  next();
}

app.get('/', function (req, res) {
  db.all(`SELECT * FROM categories`, [], function (err, categories) {
    if (err) return res.send('Database error');

    db.all(`
      SELECT *
      FROM products
      WHERE published_at <= DATE('now')
      LIMIT 8
    `, [], function (err, products) {
      if (err) return res.send('Database error');

      res.render('index', {
        products,
        categories,

        hero: {
          image: 'https://placehold.co/600x400.png',
          title: 'Freaky Fashion',
          text: 'Välkommen till vår butik'
        },

        spots: [
          {
            image: 'https://placehold.co/600x400.png',
            text: 'Kläder',
            link: '/categories/klader'
          },
          {
            image: 'https://placehold.co/600x400.png',
            text: 'Accessoarer',
            link: '/categories/accessoarer'
          },
          {
            image: 'https://placehold.co/600x400.png',
            text: 'Skor',
            link: '/categories/skor'
          }
        ],
        favoriteProductIds: req.session.favorites || [],
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    });
  });
});

app.get('/categories/:slug', (req, res) => {
  const slug = req.params.slug;

  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    db.get(`SELECT * FROM categories WHERE slug = ?`, [slug], (err, category) => {
      if (err) return res.send('Database error');
      if (!category) return res.status(404).send('Category not found');

      db.all(`
        SELECT *
        FROM products
        WHERE category_id = ?
        AND published_at <= DATE('now')
      `, [category.id], (err, products) => {
        if (err) return res.send('Database error');

        res.render('category', {
          products,
          categories,
          category,
          favoriteProductIds: req.session.favorites || [],
          favoriteCount: getFavoriteCount(req),
          cartCount: getCartCount(req)
        });
      });
    });
  });
});

app.get('/news', (req, res) => {
  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    db.all(`
      SELECT *
      FROM products
      WHERE published_at <= DATE('now')
      AND published_at >= DATE('now', '-7 days')
    `, [], (err, products) => {
      if (err) return res.send('Database error');

      res.render('news', {
        products,
        categories,
        favoriteProductIds: req.session.favorites || [],
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    });
  });
});

app.get('/products/:slug', (req, res) => {
  const slug = req.params.slug;

  db.get(`
    SELECT *
    FROM products
    WHERE slug = ?
    AND published_at <= DATE('now')
  `, [slug], (err, product) => {
    if (err) return res.send('Database error');
    if (!product) return res.status(404).send('Product not found');

    db.all(`SELECT * FROM categories`, [], (err, categories) => {
      if (err) return res.send('Database error');

      db.all(`
        SELECT *
        FROM products
        WHERE id != ?
        AND published_at <= DATE('now')
        LIMIT 6
      `, [product.id], (err, similarProducts) => {
        if (err) return res.send('Database error');

        res.render('product-details', {
          product,
          similarProducts,
          categories,
          favoriteCount: getFavoriteCount(req),
          cartCount: getCartCount(req)
        });
      });
    });
  });
});

app.get('/search', (req, res) => {
  const searchTerm = req.query.q || '';

  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    db.all(`
      SELECT *
      FROM products
      WHERE name LIKE ?
      AND published_at <= DATE('now')
    `, [`%${searchTerm}%`], (err, products) => {
      if (err) return res.send('Database error');

      res.render('search', {
        products,
        categories,
        searchTerm,
        favoriteProductIds: req.session.favorites || [],
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    });
  });
});

app.post('/favorites/:id', (req, res) => {
  const productId = Number(req.params.id);

  if (!req.session.favorites) {
    req.session.favorites = [];
  }

  if (req.session.favorites.includes(productId)) {
    req.session.favorites = req.session.favorites.filter(id => id !== productId);
  } else {
    req.session.favorites.push(productId);
  }

  res.redirect('back');
});

app.get('/favorites', (req, res) => {
  const favoriteIds = req.session.favorites || [];

  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    if (favoriteIds.length === 0) {
      return res.render('favorites', {
        products: [],
        categories,
        favoriteProductIds: favoriteIds,
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    }

    const placeholders = favoriteIds.map(() => '?').join(',');

    db.all(`
      SELECT *
      FROM products
      WHERE id IN (${placeholders})
    `, favoriteIds, (err, products) => {
      if (err) return res.send('Database error');

      res.render('favorites', {
        products,
        categories,
        favoriteProductIds: favoriteIds,
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    });
  });
});

app.post('/cart/:productId', (req, res) => {
  const productId = Number(req.params.productId);

  if (!req.session.cart) req.session.cart = [];

  req.session.cart.push(productId);

  res.redirect(req.get('referer') || '/');
});

app.get('/basket', (req, res) => {
  const cartIds = req.session.cart || [];

  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    if (cartIds.length === 0) {
      return res.render('basket', {
        products: [],
        categories,
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    }

    const uniqueIds = [...new Set(cartIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');

    db.all(`
      SELECT *
      FROM products
      WHERE id IN (${placeholders})
    `, uniqueIds, (err, products) => {
      if (err) return res.send('Database error');

      const cartProducts = products.map(product => {
        const quantity = cartIds.filter(id => id === product.id).length;

        return {
          ...product,
          quantity,
          total: quantity * product.price
        };
      });

      res.render('basket', {
        products: cartProducts,
        categories,
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    });
  });
});

app.post('/basket/update/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body.quantity);

  let cart = req.session.cart || [];
  cart = cart.filter(id => id !== productId);

  for (let i = 0; i < quantity; i++) {
    cart.push(productId);
  }

  req.session.cart = cart;
  res.redirect('/basket');
});

app.post('/basket/delete/:productId', (req, res) => {
  const productId = Number(req.params.productId);

  let cart = req.session.cart || [];
  cart = cart.filter(id => id !== productId);

  req.session.cart = cart;
  res.redirect('/basket');
});

app.get('/checkout', (req, res) => {
  const cartIds = req.session.cart || [];

  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    if (cartIds.length === 0) {
      return res.render('checkout', {
        products: [],
        categories,
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    }

    const uniqueIds = [...new Set(cartIds)];
    const placeholders = uniqueIds.map(() => '?').join(',');

    db.all(`
      SELECT *
      FROM products
      WHERE id IN (${placeholders})
    `, uniqueIds, (err, products) => {
      if (err) return res.send('Database error');

      const checkoutProducts = products.map(product => {
        const quantity = cartIds.filter(id => id === product.id).length;

        return {
          ...product,
          quantity,
          total: quantity * product.price
        };
      });

      res.render('checkout', {
        products: checkoutProducts,
        categories,
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    });
  });
});

app.get('/fake-login', (req, res) => {
  db.get(`
    SELECT *
    FROM users
    WHERE email = ?
  `, ['admin@freakyfashion.com'], (err, user) => {
    if (err) return res.send('Database error');
    if (!user) return res.send('Admin user not found');

    req.session.user = user;
    res.send('Admin logged in');
  });
});

app.get('/admin/products', requireAdmin, (req, res) => {
  db.all(`
    SELECT *
    FROM products
    ORDER BY id DESC
  `, [], (err, products) => {
    if (err) return res.send('Database error');

    res.render('admin/products/index', { products });
  });
});

app.post('/admin/products/delete/:id', requireAdmin, (req, res) => {
  const productId = req.params.id;

  db.run(`DELETE FROM products WHERE id = ?`, [productId], (err) => {
    if (err) return res.send('Database error');

    res.redirect('/admin/products');
  });
});

app.get('/admin/products/new', requireAdmin, (req, res) => {
  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send(err.message);

    res.render('admin/products/new', { categories });
  });
});

app.post('/admin/products/new', requireAdmin, upload.single('product-image'), (req, res) => {
  const name = req.body['product-name'];
  const description = req.body['product-description'];
  const slug = req.body['product-sku'];
  const price = req.body['product-price'];
  const publishedAt = req.body['publish-date'];
  const categoryId = req.body['category-id'];
  const image = req.file ? `/images/products/${req.file.filename}` : 'https://placehold.co/600x400.png';

  db.run(`
    INSERT INTO products (name, description, slug, price, published_at, category_id, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [name, description, slug, price, publishedAt, categoryId, image], (err) => {
    if (err) {
      console.log(err.message);
      return res.send(err.message);
    }

    res.redirect('/admin/products');
  });
});

app.get('/admin/categories', requireAdmin, (req, res) => {
  db.all(`
    SELECT *
    FROM categories
    ORDER BY id DESC
  `, [], (err, categories) => {
    if (err) return res.send('Database error');

    res.render('admin/categories/index', { categories });
  });
});

app.get('/admin/categories/new', requireAdmin, (req, res) => {
  res.render('admin/categories/new');
});

app.post('/admin/categories/new', requireAdmin, upload.single('category-image'), (req, res) => {
  const name = req.body['category-name'];
  const image = req.file ? `/images/categories/${req.file.filename}` : null;

  const slug = name
    .toLowerCase()
    .replaceAll(' ', '-')
    .replaceAll('å', 'a')
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o');

  db.run(`
    INSERT INTO categories (name, slug, image)
    VALUES (?, ?, ?)
  `, [name, slug, image], (err) => {
    if (err) {
      console.log(err.message);
      return res.send(err.message);
    }

    res.redirect('/admin/categories');
  });
});

app.post('/admin/categories/delete/:id', requireAdmin, (req, res) => {
  const categoryId = req.params.id;

  db.run(`DELETE FROM categories WHERE id = ?`, [categoryId], (err) => {
    if (err) return res.send('Database error');

    res.redirect('/admin/categories');
  });
});

app.get('/register', (req, res) => {
  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    db.all(`
      SELECT *
      FROM products
      WHERE published_at <= DATE('now')
      LIMIT 8
    `, [], (err, products) => {
      if (err) return res.send('Database error');

      res.render('register', {
        categories,
        products,
        favoriteProductIds: req.session.favorites || [],
        favoriteCount: getFavoriteCount(req),
        cartCount: getCartCount(req)
      });
    });
  });
});

app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  db.run(`
    INSERT INTO users (email, password, admin)
    VALUES (?, ?, 0)
  `, [email, password], (err) => {
    if (err) return res.send('Database error');

    res.redirect('/');
  });
});

app.get('/login', (req, res) => {
  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    res.render('login', {
      categories,
      favoriteCount: getFavoriteCount(req),
      cartCount: getCartCount(req)
    });
  });
});

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;