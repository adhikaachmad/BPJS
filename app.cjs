// CommonJS wrapper for ES Modules (required by Passenger on shared hosting)
// This file is the entry point configured in cPanel Node.js setup
import("./backend/src/index.js").catch(err => {
  console.error("Failed to load application:", err);
  process.exit(1);
});
