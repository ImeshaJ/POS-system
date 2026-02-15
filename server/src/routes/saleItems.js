const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "sale_items",
  columns: ["sale_id", "product_id", "name", "price", "qty"],
  required: ["sale_id", "name", "qty"],
});
