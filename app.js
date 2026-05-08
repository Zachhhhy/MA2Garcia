const express = require("express");
const path = require("path");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const productRouter = require("./routes/productRoutes");
const userRouter = require("./routes/userRoutes");

const app = express();

app.set("trust proxy", 1);

// 1) GLOBAL SECURITY MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting (Limits requests from same IP)
const limiter = rateLimit({
  max: 100, // Allow 100 requests per hour
  windowMs: 60 * 60 * 1000, 
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body. Also cookie parser.
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'price', 'category', 'seller', 'name'
  ]
}));

// Serving static files
app.use(express.static(`${__dirname}/public`));

// 2) BROWSER PAGES AND API INFO
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "products.html"));
});

app.get("/stats", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "stats.html"));
});

app.get(["/api", "/api/v1"], (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Local Marketplace API is running.",
    pages: {
      home: "GET /",
      login: "GET /login",
      signup: "GET /signup",
      products: "GET /products",
      stats: "GET /stats"
    },
    endpoints: {
      products: {
        list: "GET /api/v1/products",
        topCheapest: "GET /api/v1/products/top-3-cheapest",
        categoryStats: "GET /api/v1/products/product-category",
        singleProduct: "GET /api/v1/products/:id",
        create: "POST /api/v1/products (requires login)",
        update: "PATCH /api/v1/products/:id (requires login)",
        delete: "DELETE /api/v1/products/:id (requires login)"
      },
      users: {
        signup: "POST /api/v1/users/signup",
        login: "POST /api/v1/users/login",
        currentUser: "GET /api/v1/users/me (requires login)",
        forgotPassword: "POST /api/v1/users/forgotPassword",
        resetPassword: "PATCH /api/v1/users/resetPassword/:token",
        updatePassword: "PATCH /api/v1/users/updateMyPassword",
        updateMe: "PATCH /api/v1/users/updateMe",
        deleteMe: "DELETE /api/v1/users/deleteMe"
      }
    }
  });
});

// 3) API ROUTES
app.use("/api/v1/products", productRouter);
app.use("/api/v1/users", userRouter);

// Add 404 Not Found Errors Handler for undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

module.exports = app;
