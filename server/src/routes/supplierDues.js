const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "supplier_dues",
  columns: [
    "supplier_id",
    "total_amount",
    "paid_amount",
    "due_amount",
    "last_payment_date",
    "due_date",
    "notes",
  ],
});
