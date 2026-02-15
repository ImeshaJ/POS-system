const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "purchase_items",
  columns: ["purchase_id", "product_id", "qty", "cost_price"],
  required: ["purchase_id", "product_id", "qty"],
});
