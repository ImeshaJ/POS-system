const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "purchase_return_items",
  columns: ["purchase_return_id", "purchase_item_id", "product_id", "qty", "cost_price"],
  required: ["purchase_return_id", "product_id", "qty"],
});
