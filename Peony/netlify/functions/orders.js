// netlify/functions/orders.js
const fs = require("fs");
const path = require("path");

const ordersFile = path.join(__dirname, "../../data/orders.json");

exports.handler = async (event) => {
  if (!fs.existsSync(ordersFile)) fs.writeFileSync(ordersFile, JSON.stringify([]));
  let orders = JSON.parse(fs.readFileSync(ordersFile));

  switch (event.httpMethod) {
    case "GET":
      const { phone } = event.queryStringParameters || {};
      const result = phone ? orders.filter(o => o.phone === phone) : orders;
      return { statusCode: 200, body: JSON.stringify(result) };

    case "POST":
      const order = JSON.parse(event.body);
      orders.push(order);
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    case "PUT":
      const { id, status } = JSON.parse(event.body);
      orders = orders.map(o => o.id === id ? { ...o, status } : o);
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    default:
      return { statusCode: 405, body: "Method Not Allowed" };
  }
};
