const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "pets",
  columns: [
    "client_id",
    "name",
    "type",
    "breed",
    "gender",
    "age",
    "weight",
    "status",
  ],
  required: ["client_id", "name"],
});
