const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "add_on_services",
  columns: [
    "service_id",
    "addon_id",
    "name",
    "price",
    "description",
    "status",
    "duration_days",
    "duration_hours",
    "duration_minutes",
    "service_type"
  ],
});
