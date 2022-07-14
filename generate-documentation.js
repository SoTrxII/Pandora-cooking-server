#! /bin/node
const swaggerJsdoc = require("swagger-jsdoc");
const { writeFileSync } = require("fs");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pandora Cooking Server",
      version: "1.0.0",
    },
  },
  apis: ["./src/controllers/*.ts"], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);
writeFileSync("./openapi.json", JSON.stringify(openapiSpecification));
