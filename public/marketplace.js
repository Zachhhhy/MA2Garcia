const page = document.body.dataset.page;
const tokenKey = "marketplaceToken";
const userKey = "marketplaceUser";

const formatCurrency = value =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const escapeHtml = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);

const getToken = () => localStorage.getItem(tokenKey);

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(userKey) || "null");
  } catch (error) {
    return null;
  }
};

const setMessage = (element, text, type = "info") => {
  if (!element) return;
  element.textContent = text;
  element.dataset.type = type;
};

const apiRequest = async (url, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }

  return data;
};

const initCosmos = () => {
  const canvas = document.querySelector(".cosmos-canvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  let stars = [];
  let width = 0;
  let height = 0;

  const resize = () => {
    width = canvas.width = window.innerWidth * window.devicePixelRatio;
    height = canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const count = Math.min(180, Math.floor(window.innerWidth * window.innerHeight / 7200));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: (Math.random() * 1.3 + 0.35) * window.devicePixelRatio,
      speed: Math.random() * 0.16 + 0.04,
      alpha: Math.random() * 0.55 + 0.28
    }));
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    stars.forEach(star => {
      star.y += star.speed * window.devicePixelRatio;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fillStyle = `rgba(226, 232, 255, ${star.alpha})`;
      context.fill();
    });
    requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener("resize", resize);
};

const initNavigation = () => {
  const nav = document.querySelector("[data-site-nav]");
  const menuButton = document.querySelector("[data-menu-button]");
  const user = getUser();
  const token = getToken();

  document.querySelectorAll("[data-nav-link], [data-auth-link]").forEach(link => {
    const key = link.dataset.navLink || link.dataset.authLink;
    link.classList.toggle("is-active", key === page);
  });

  if (token && user && nav) {
    nav.querySelectorAll("[data-auth-link]").forEach(link => link.remove());

    const account = document.createElement("span");
    account.className = "nav-account";
    account.textContent = user.name || user.email || "Account";

    const logout = document.createElement("button");
    logout.className = "menu-button";
    logout.type = "button";
    logout.textContent = "Log Out";
    logout.addEventListener("click", () => {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
      window.location.href = "/";
    });

    nav.append(account, logout);
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => nav.classList.toggle("is-open"));
  }
};

const initAuthForm = () => {
  const form = document.querySelector("[data-auth-form]");
  if (!form) return;

  const message = document.querySelector("[data-form-message]");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    setMessage(message, "Sending account request...");

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const data = await apiRequest(form.dataset.endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      localStorage.setItem(tokenKey, data.token);
      localStorage.setItem(userKey, JSON.stringify(data.data.user));
      setMessage(message, form.dataset.success, "success");
      window.setTimeout(() => {
        window.location.href = "/products";
      }, 650);
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
};

const productState = {
  products: [],
  category: "All",
  price: "all",
  sort: "newest",
  query: ""
};

const getProductId = product => product._id || product.id;

const productMatchesPrice = product => {
  if (productState.price === "all") return true;
  const [min, max] = productState.price.split("-").map(Number);
  return product.price >= min && product.price < max;
};

const filteredProducts = () => {
  const query = productState.query.trim().toLowerCase();
  const products = productState.products.filter(product => {
    const categoryMatch = productState.category === "All" || product.category === productState.category;
    const textMatch = !query || [product.name, product.category, product.seller, product.description]
      .join(" ")
      .toLowerCase()
      .includes(query);
    return categoryMatch && textMatch && productMatchesPrice(product);
  });

  return products.sort((a, b) => {
    if (productState.sort === "price-asc") return a.price - b.price;
    if (productState.sort === "price-desc") return b.price - a.price;
    if (productState.sort === "name") return a.name.localeCompare(b.name);
    return new Date(b.postedDate || 0) - new Date(a.postedDate || 0);
  });
};

const renderCategoryFilters = () => {
  const container = document.querySelector("[data-category-filters]");
  if (!container) return;

  const categories = ["All", ...new Set(productState.products.map(product => product.category).filter(Boolean).sort())];

  container.innerHTML = categories.map(category => `
    <button class="chip ${category === productState.category ? "is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  container.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      productState.category = button.dataset.category;
      renderProducts();
      renderCategoryFilters();
    });
  });
};

const renderProducts = () => {
  const grid = document.querySelector("[data-products-grid]");
  const status = document.querySelector("[data-products-status]");
  if (!grid) return;

  const products = filteredProducts();
  setMessage(status, `${products.length} product${products.length === 1 ? "" : "s"} found.`, "success");

  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state">No products match the current filters.</div>`;
    return;
  }

  const loggedIn = Boolean(getToken());
  grid.innerHTML = products.map(product => {
    const id = getProductId(product);
    const description = product.description || "No description provided.";
    const discount = product.priceDiscount ? `<span class="discount">Discount: ${formatCurrency(product.priceDiscount)}</span>` : "";
    const actions = loggedIn ? `
      <div class="card-actions">
        <button class="button button-ghost" type="button" data-edit-product="${id}">Edit</button>
        <button class="button button-danger" type="button" data-delete-product="${id}">Delete</button>
      </div>
    ` : "";

    return `
      <article class="product-card">
        <div class="product-head">
          <span class="category-pill">${escapeHtml(product.category)}</span>
        </div>
        <h2>${escapeHtml(product.name)}</h2>
        <p class="price">${formatCurrency(product.price)}</p>
        ${discount}
        <p class="product-meta">${escapeHtml(description)}</p>
        <p class="seller-line">Seller: ${escapeHtml(product.seller)}</p>
        ${actions}
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-edit-product]").forEach(button => {
    button.addEventListener("click", () => openProductModal(button.dataset.editProduct));
  });

  grid.querySelectorAll("[data-delete-product]").forEach(button => {
    button.addEventListener("click", () => deleteProduct(button.dataset.deleteProduct));
  });
};

const openProductModal = id => {
  const modal = document.querySelector("[data-product-modal]");
  const form = document.querySelector("[data-product-form]");
  const title = document.querySelector("#productModalTitle");
  const message = document.querySelector("[data-product-form-message]");

  if (!getToken()) {
    window.location.href = "/login";
    return;
  }

  form.reset();
  setMessage(message, "");
  form.elements.id.value = "";
  title.textContent = "Add Product";

  if (id) {
    const product = productState.products.find(item => getProductId(item) === id);
    if (product) {
      title.textContent = "Update Product";
      form.elements.id.value = getProductId(product);
      form.elements.name.value = product.name || "";
      form.elements.price.value = product.price || "";
      form.elements.category.value = product.category || "";
      form.elements.seller.value = product.seller || "";
      form.elements.description.value = product.description || "";
      form.elements.priceDiscount.value = product.priceDiscount || "";
    }
  }

  modal.hidden = false;
};

const closeProductModal = () => {
  const modal = document.querySelector("[data-product-modal]");
  if (modal) modal.hidden = true;
};

const saveProduct = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-product-form-message]");
  const button = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const id = formData.get("id");
  const payload = Object.fromEntries(formData.entries());

  delete payload.id;
  payload.price = Number(payload.price);

  if (payload.priceDiscount) {
    payload.priceDiscount = Number(payload.priceDiscount);
  } else {
    delete payload.priceDiscount;
  }

  button.disabled = true;
  setMessage(message, "Saving product...");

  try {
    await apiRequest(id ? `/api/v1/products/${id}` : "/api/v1/products", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload)
    });
    setMessage(message, id ? "Product updated." : "Product created.", "success");
    await loadProducts();
    window.setTimeout(closeProductModal, 500);
  } catch (error) {
    setMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
};

const deleteProduct = async id => {
  const status = document.querySelector("[data-products-status]");
  setMessage(status, "Deleting product...");

  try {
    await apiRequest(`/api/v1/products/${id}`, { method: "DELETE" });
    productState.products = productState.products.filter(product => getProductId(product) !== id);
    renderCategoryFilters();
    renderProducts();
  } catch (error) {
    setMessage(status, error.message, "error");
  }
};

const loadProducts = async () => {
  const status = document.querySelector("[data-products-status]");
  try {
    const data = await apiRequest("/api/v1/products?limit=200&sort=-postedDate");
    productState.products = data.data.products || [];
    renderCategoryFilters();
    renderProducts();
  } catch (error) {
    setMessage(status, error.message, "error");
  }
};

const initProductsPage = () => {
  if (page !== "products") return;

  document.querySelector("[data-open-product-modal]")?.addEventListener("click", () => openProductModal());
  document.querySelector("[data-close-product-modal]")?.addEventListener("click", closeProductModal);
  document.querySelector("[data-product-modal]")?.addEventListener("click", event => {
    if (event.target.matches("[data-product-modal]")) closeProductModal();
  });
  document.querySelector("[data-product-form]")?.addEventListener("submit", saveProduct);

  document.querySelector("[data-product-search]")?.addEventListener("input", event => {
    productState.query = event.target.value;
    renderProducts();
  });
  document.querySelector("[data-price-filter]")?.addEventListener("change", event => {
    productState.price = event.target.value;
    renderProducts();
  });
  document.querySelector("[data-sort-filter]")?.addEventListener("change", event => {
    productState.sort = event.target.value;
    renderProducts();
  });
  document.querySelector("[data-reset-filters]")?.addEventListener("click", () => {
    productState.category = "All";
    productState.price = "all";
    productState.sort = "newest";
    productState.query = "";
    document.querySelector("[data-product-search]").value = "";
    document.querySelector("[data-price-filter]").value = "all";
    document.querySelector("[data-sort-filter]").value = "newest";
    renderCategoryFilters();
    renderProducts();
  });

  loadProducts();
};

const renderStats = stats => {
  const grid = document.querySelector("[data-stats-grid]");
  const status = document.querySelector("[data-stats-status]");
  if (!grid) return;

  if (stats.length === 0) {
    setMessage(status, "No product stats yet.", "info");
    grid.innerHTML = `<div class="empty-state">Add products to generate category statistics.</div>`;
    return;
  }

  const totals = stats.reduce((acc, item) => {
    acc.products += item.numProducts || 0;
    acc.value += item.totalValue || 0;
    return acc;
  }, { products: 0, value: 0 });

  document.querySelector("[data-stat-total-products]").textContent = totals.products;
  document.querySelector("[data-stat-total-value]").textContent = formatCurrency(totals.value);
  document.querySelector("[data-stat-total-categories]").textContent = stats.length;
  setMessage(status, `${stats.length} categor${stats.length === 1 ? "y" : "ies"} analyzed.`, "success");

  grid.innerHTML = stats.map(item => `
    <article class="stat-card">
      <span class="category-pill">${item.numProducts} item${item.numProducts === 1 ? "" : "s"}</span>
      <h2>${escapeHtml(item._id || "Uncategorized")}</h2>
      <dl class="stat-metrics">
        <div>
          <dt>Avg. list price</dt>
          <dd>${formatCurrency(item.avgPrice)}</dd>
        </div>
        <div>
          <dt>Total value</dt>
          <dd>${formatCurrency(item.totalValue)}</dd>
        </div>
        <div>
          <dt>Lowest listing</dt>
          <dd>${formatCurrency(item.minPrice)}</dd>
        </div>
        <div>
          <dt>Highest listing</dt>
          <dd>${formatCurrency(item.maxPrice)}</dd>
        </div>
      </dl>
      <p class="stat-note">The market range for ${escapeHtml(item._id || "this category")} spans from ${formatCurrency(item.minPrice)} to ${formatCurrency(item.maxPrice)}.</p>
    </article>
  `).join("");
};

const initStatsPage = async () => {
  if (page !== "stats") return;

  const status = document.querySelector("[data-stats-status]");
  try {
    const data = await apiRequest("/api/v1/products/product-category");
    renderStats(data.data.stats || []);
  } catch (error) {
    setMessage(status, error.message, "error");
  }
};

const initHomeStats = async () => {
  const total = document.querySelector("[data-total-products]");
  if (!total) return;

  try {
    const data = await apiRequest("/api/v1/products?limit=200");
    total.textContent = data.results || 0;
  } catch (error) {
    total.textContent = "API";
  }
};

initCosmos();
initNavigation();
initAuthForm();
initProductsPage();
initStatsPage();
initHomeStats();
