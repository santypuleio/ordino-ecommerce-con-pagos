import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info("Backend listening", {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  });
});

