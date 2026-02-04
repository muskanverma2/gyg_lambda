const express = require("express");
const router = express.Router();
const gygAvailabilityRoute = require("./gygAvailability.route.js");
const recurrenceRoute = require("./recurrence.route");

const defaultRoutes = [
  {
    path: "/gygAvailability",
    route: gygAvailabilityRoute,
  },
  {
    path: "/recurrence",
    route: recurrenceRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
