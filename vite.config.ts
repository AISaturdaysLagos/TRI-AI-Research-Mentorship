import net from "node:net";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function bridgeLoopback(port: number): Plugin {
  return {
    name: `bridge-loopback-${port}`,
    configureServer(devServer) {
      const bridge = net.createServer((socket) => {
        const upstream = net.connect({ host: "127.0.0.1", port });
        const close = () => {
          socket.destroy();
          upstream.destroy();
        };
        socket.pipe(upstream);
        upstream.pipe(socket);
        socket.on("error", close);
        upstream.on("error", close);
      });
      bridge.on("error", () => undefined);
      bridge.listen(port, "::1");
      devServer.httpServer?.on("close", () => bridge.close());
    },
  };
}

export default defineConfig({
  plugins: [react(), bridgeLoopback(5173), bridgeLoopback(9099), bridgeLoopback(8080)],
  // Relative base so the static build works on GitHub Pages project sites.
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
