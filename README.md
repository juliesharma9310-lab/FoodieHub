# FoodieHub

FoodieHub is a sample food-ordering website built with HTML, CSS, JavaScript,
and a small Java HTTP server.

## Features

- Browse, search, and filter the menu
- Add dishes to a cart and adjust quantities
- Submit customer details and place a demo order
- Validate orders and calculate totals on the Java server

## Requirements

- Java 11 or later

## Run locally

From the project directory, compile and start the Java server:

```powershell
javac -d build FoodieHubServer.java
java -cp build FoodieHubServer
```

Open [http://localhost:8081](http://localhost:8081) in your browser. Keep the
server running while using the website.

Orders are for demonstration only. The project does not process payments or
arrange real deliveries. Order details are printed in the server console.

## Project files

- `project.html` — website markup
- `style.css` — website styles
- `script.js` — menu, cart, and checkout interactions
- `FoodieHubServer.java` — static-file server and demo order endpoint
