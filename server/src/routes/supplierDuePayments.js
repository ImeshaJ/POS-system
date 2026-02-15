const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "supplier_due_payments",
  columns: ["supplier_due_id", "payment_date", "amount", "reference"],
  required: ["supplier_due_id", "amount"],
});
