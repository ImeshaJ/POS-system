const { createCrudRouter } = require("./crud");

module.exports = createCrudRouter({
  table: "staff_schedules",
  columns: [
    "date",
    "staff_name",
    "staff_id",
    "role",
    "start_time",
    "end_time",
    "status",
    "contact",
    "notes",
  ],
  required: ["date", "staff_name", "role", "start_time", "end_time"],
});
