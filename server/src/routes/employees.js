const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "employees",
  columns: [
    "code",
    "name",
    "email",
    "phone",
    "role",
    "department",
    "salary",
    "join_date",
    "status",
    "address",
    "bank_account",
  ],
});
