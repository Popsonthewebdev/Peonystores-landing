// netlify/functions/products.js
const fs = require("fs");
const path = require("path");

const productsFile = path.join(__dirname, "../../data/products.json");

exports.handler = async (event) => {
  if (!fs.existsSync(productsFile)) fs.writeFileSync(productsFile, JSON.stringify([]));
  let products = JSON.parse(fs.readFileSync(productsFile));

  switch (event.httpMethod) {
    case "GET":
      return { statusCode: 200, body: JSON.stringify(products) };

    case "POST":
      const data = JSON.parse(event.body);
      const index = products.findIndex(p => p.id === data.id);
      if (index >= 0) products[index] = data; // update
      else products.push(data);                // add new
      fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    case "DELETE":
      const { id } = JSON.parse(event.body);
      products = products.filter(p => p.id !== id);
      fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    default:
      return { statusCode: 405, body: "Method Not Allowed" };
  }
};
