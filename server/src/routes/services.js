const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "services",
  columns: ["name", "category", "price", "cost_price", "status"],
});
