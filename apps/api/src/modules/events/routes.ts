import type { FastifyPluginAsync } from "fastify";
import { resolveRequestOrg } from "../../plugins/auth";

export const eventsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/stream", async (request, reply) => {
    const orgId = resolveRequestOrg(request);

    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });

    const writeEvent = (event: Record<string, unknown>) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    writeEvent({ type: "system.connected", at: new Date().toISOString() });

    const unsubscribe = app.eventBus.subscribe((event) => {
      if (event.org_id !== orgId) return;
      writeEvent(event);
    });

    const keepAlive = setInterval(() => {
      writeEvent({ type: "system.ping", at: new Date().toISOString() });
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

    return reply;
  });
};
