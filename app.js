var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var db = require('./database/db');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

var app = express();

// view engine setup
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

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

function getFavoriteCount(req) {
  return (req.session.favorites || []).length;
}

function getCartCount(req) {
  return (req.session.cart || []).reduce((total, item) => total + item.quantity, 0);
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
        products: products,
        categories: categories,
        favoriteProductIds: req.session.favorites || [],
        favoriteCount: (req.session.favorites || []).length,
        cartCount: (req.session.cart || []).length
      });
    });
  });
});

app.get('/categories/:slug', (req, res) => {
  const slug = req.params.slug;

  db.all(`SELECT * FROM categories`, [], (err, categories) => {
    if (err) return res.send('Database error');

    db.get(`
          SELECT *
          FROM categories
          WHERE slug = ?
      `, [slug], (err, category) => {
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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
