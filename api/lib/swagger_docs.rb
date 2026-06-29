module Api
  module SwaggerDocs
    module_function

    def spec
      {
        openapi: "3.0.3",
        info: {
          title: "Scrapy API",
          version: "1.0.0",
          description: "API para gestionar productos con endpoints CRUD"
        },
        servers: [
          {
            url: "http://localhost:8000"
          }
        ],
        paths: {
          "/products": {
            get: {
              summary: "List products",
              responses: {
                "200" => {
                  description: "A list of products"
                },
                "500" => {
                  description: "Internal server error"}
              }
            },
            post: {
              summary: "Create or update a product",
              requestBody: {
                required: true,
                content: {
                  "application/json" => {
                    schema: {
                      type: "object",
                      required: ["asin", "product_name"],
                      properties: {
                        asin: { type: "string" },
                        product_name: { type: "string" },
                      }
                    }
                  }
                }
              },
              responses: {
                "201" => { description: "Product created or updated" },
                "400" => { description: "Invalid payload" },
                "409" => { description: "ASIN already exists" },
                "500" => { description: "Internal server error" }
              }
            }
          },
          "/products/{asin}": {
            get: {
              summary: "Get a product by ASIN",
              parameters: [
                {
                  name: "asin",
                  in: "path",
                  required: true,
                  schema: { type: "string" }
                }
              ],
              responses: {
                "200" => { description: "Product found" },
                "400" => { description: "Invalid ASIN" },
                "404" => { description: "Product not found" },
                "500" => { description: "Internal server error" }
              }
            },
            delete: {
              summary: "Delete a product by ASIN",
              parameters: [
                {
                  name: "asin",
                  in: "path",
                  required: true,
                  schema: { type: "string" }
                }
              ],
              responses: {
                "200" => { description: "Product deleted" },
                "400" => { description: "Invalid ASIN" },
                "404" => { description: "Product not found" },
                "500" => { description: "Internal server error" }
              }
            }
          },
          "/products/{asin}/price-history": {
            get: {
              summary: "Get the price history of a product",
              parameters: [
                {
                  name: "asin",
                  in: "path",
                  required: true,
                  schema: { type: "string" }
                }
              ],
              responses: {
                "200" => { description: "Product found" },
                "400" => { description: "Invalid ASIN" },
                "404" => { description: "Product not found" },
                "500" => { description: "Internal server error" }
              }
            }
          }
        }
      }
    end

    def html
      <<~HTML
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Scrapy API Swagger</title>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
              window.onload = () => {
                SwaggerUIBundle({
                  url: '/swagger.json',
                  dom_id: '#swagger-ui'
                });
              };
            </script>
          </body>
        </html>
      HTML
    end
  end
end
