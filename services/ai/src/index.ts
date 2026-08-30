import { buildAIServer } from "./server";
import { getEnv } from "@nexusdesk/config";

async function main() {
  const env = getEnv();
  const server = buildAIServer();

  try {
    const address = await server.listen({
      port: env.AI_PORT,
      host: "0.0.0.0",
    });
    server.log.info(`AI Diagnostics Service listening on ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  main();
}
