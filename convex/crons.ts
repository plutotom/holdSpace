import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "renew google watch channels",
  { hours: 12 },
  internal.routes.google.renewWatchChannels,
  {}
);

export default crons;
