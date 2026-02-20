const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "sale_items",
  columns: ["sale_id", "product_id", "name", "price", "qty", "item_type", "item_code"],
  required: ["sale_id", "name", "qty"],
});
