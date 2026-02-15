const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "suppliers",
  columns: [
    "code",
    "name",
    "email",
    "phone",
    "address",
    "category",
    "contact_person",
    "bank_details",
    "tax_id",
    "status",
  ],
});
