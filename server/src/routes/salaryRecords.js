const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "salary_records",
  columns: [
    "employee_id",
    "month",
    "base_salary",
    "allowances",
    "deductions",
    "net_salary",
    "status",
    "payment_date",
  ],
});
