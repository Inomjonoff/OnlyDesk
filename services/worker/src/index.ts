import { buildWorkerServer } from "./server";
import { getEnv } from "@nexusdesk/config";

async function main() {
  const env = getEnv();
  const server = buildWorkerServer();

  try {
    const address = await server.listen({
      port: env.WORKER_PORT,
      host: "0.0.0.0",
    });
    server.log.info(`Background Worker listening on ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  main();
}
