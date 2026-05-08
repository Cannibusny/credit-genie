import { config, stubs } from "./lib/config.js";
import { log } from "./lib/logger.js";
import { app } from "./app.js";

app.listen(config.PORT, () => {
  log.info({ port: config.PORT, stubs }, `Credit Genie v3.1.0 running on :${config.PORT}`);
});
