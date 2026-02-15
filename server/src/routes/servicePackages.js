const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "service_packages",
  columns: [
    "service_id",
    "package_id",
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
