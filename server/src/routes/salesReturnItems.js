const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "sales_return_items",
  columns: ["sales_return_id", "sale_item_id", "name", "qty", "price"],
  required: ["sales_return_id", "name", "qty"],
});
