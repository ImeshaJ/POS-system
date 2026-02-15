const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "product_revenue",
  columns: [
    "product",
    "category",
    "qty",
    "unit_price",
    "revenue",
    "cost_price",
    "profit",
    "date",
  ],
});
