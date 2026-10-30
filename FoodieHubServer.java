import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

public class FoodieHubServer {
    private static final int PORT = 8081;
    private static final int MAX_REQUEST_BYTES = 16_384;
    private static final Map<Integer, Integer> PRICES = Map.of(
            1, 249, 2, 299, 3, 159, 4, 189, 5, 99,
            6, 69, 7, 119, 8, 89, 9, 89
    );
    private static final Map<String, String> STATIC_FILES = Map.of(
            "/", "project.html",
            "/project.html", "project.html",
            "/style.css", "style.css",
            "/script.js", "script.js"
    );

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(
                new InetSocketAddress(InetAddress.getLoopbackAddress(), PORT), 0);
        server.createContext("/api/orders", FoodieHubServer::handleOrder);
        server.createContext("/", FoodieHubServer::handleStaticFile);
        server.setExecutor(null);
        server.start();
        System.out.println("FoodieHub is running at http://localhost:" + PORT);
    }

    private static void handleOrder(HttpExchange exchange) throws IOException {
        if (!"/api/orders".equals(exchange.getRequestURI().getPath())) {
            sendJson(exchange, 404, "{\"error\":\"Endpoint not found.\"}");
            exchange.close();
            return;
        }
        if (!"POST".equals(exchange.getRequestMethod())) {
            sendJson(exchange, 405, "{\"error\":\"Use POST to submit an order.\"}");
            return;
        }

        try {
            byte[] requestBytes = exchange.getRequestBody().readNBytes(MAX_REQUEST_BYTES + 1);
            if (requestBytes.length > MAX_REQUEST_BYTES) {
                sendJson(exchange, 413, "{\"error\":\"Order details are too large.\"}");
                return;
            }

            Map<String, String> fields = new HashMap<>();
            Map<Integer, Integer> quantities = new HashMap<>();
            parseForm(new String(requestBytes, StandardCharsets.UTF_8), fields, quantities);

            String name = fields.getOrDefault("customerName", "").trim();
            String phone = fields.getOrDefault("customerPhone", "").trim();
            String address = fields.getOrDefault("customerAddress", "").trim();
            if (name.isBlank() || name.length() > 100) {
                sendJson(exchange, 400, "{\"error\":\"Enter a name of 1 to 100 characters.\"}");
                return;
            }
            if (!phone.matches("[0-9]{10}")) {
                sendJson(exchange, 400, "{\"error\":\"Enter a valid 10-digit phone number.\"}");
                return;
            }
            if (address.isBlank() || address.length() > 500) {
                sendJson(exchange, 400, "{\"error\":\"Enter an address of 1 to 500 characters.\"}");
                return;
            }
            if (quantities.isEmpty()) {
                sendJson(exchange, 400, "{\"error\":\"Your cart is empty.\"}");
                return;
            }

            int total = 0;
            for (Map.Entry<Integer, Integer> item : quantities.entrySet()) {
                total += PRICES.get(item.getKey()) * item.getValue();
            }
            String orderNumber = "FH" + ThreadLocalRandom.current().nextInt(10_000, 100_000);
            sendJson(exchange, 200, "{\"orderNumber\":\"" + orderNumber + "\",\"total\":" + total + "}");
            System.out.printf("Demo order %s received for %s (INR %d)%n", orderNumber, name, total);
        } catch (IllegalArgumentException exception) {
            sendJson(exchange, 400, "{\"error\":\"" + jsonEscape(exception.getMessage()) + "\"}");
        } finally {
            exchange.close();
        }
    }

    private static void parseForm(String body, Map<String, String> fields,
                                  Map<Integer, Integer> quantities) {
        for (String pair : body.split("&")) {
            if (pair.isEmpty()) continue;
            String[] parts = pair.split("=", 2);
            String key = decode(parts[0]);
            String value = parts.length == 2 ? decode(parts[1]) : "";

            if ("item".equals(key)) {
                String[] itemParts = value.split(":", 2);
                try {
                    int id = Integer.parseInt(itemParts[0]);
                    int quantity = itemParts.length == 2 ? Integer.parseInt(itemParts[1]) : 0;
                    if (!PRICES.containsKey(id) || quantity < 1 || quantity > 99
                            || quantities.containsKey(id)) {
                        throw new IllegalArgumentException("Invalid cart item.");
                    }
                    quantities.put(id, quantity);
                } catch (NumberFormatException exception) {
                    throw new IllegalArgumentException("Invalid cart item.");
                }
            } else {
                fields.put(key, value);
            }
        }
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static void handleStaticFile(HttpExchange exchange) throws IOException {
        String fileName = STATIC_FILES.get(exchange.getRequestURI().getPath());
        if (!"GET".equals(exchange.getRequestMethod()) || fileName == null) {
            exchange.sendResponseHeaders(404, -1);
            exchange.close();
            return;
        }

        Path file = Path.of(fileName);
        if (!Files.isRegularFile(file)) {
            exchange.sendResponseHeaders(404, -1);
            exchange.close();
            return;
        }

        String contentType = fileName.endsWith(".css") ? "text/css; charset=UTF-8"
                : fileName.endsWith(".js") ? "text/javascript; charset=UTF-8"
                : "text/html; charset=UTF-8";
        byte[] content = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(200, content.length);
        exchange.getResponseBody().write(content);
        exchange.close();
    }

    private static void sendJson(HttpExchange exchange, int status, String body) throws IOException {
        byte[] content = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, content.length);
        exchange.getResponseBody().write(content);
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
