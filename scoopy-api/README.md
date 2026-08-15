# Scoopy API

Backend API for Scoopy, built with Ruby on Rails.

This service provides:

- User authentication with Devise + JWT
- Product CRUD
- Product search by name
- Product price history retrieval
- Product scraper incidents retrieval

## Why Rails + Devise JWT

We use Rails to move quickly with strong conventions and PostgreSQL integration. For authentication, we use Devise with `devise-jwt` so clients can authenticate through bearer tokens in stateless API requests.

## Tech Stack

- Ruby on Rails `~> 8.1.3`
- PostgreSQL
- Devise + devise-jwt
- Rack CORS

## Project Structure

```text
scoopy-api/
  app/
    controllers/
      application_controller.rb
      products_controller.rb
      users/
        registrations_controller.rb
        sessions_controller.rb
    models/
      user.rb
      product.rb
      provider.rb
      providers_product.rb
      price_history.rb
      scraper_incident.rb
      jwt_denylist.rb
    serializers/
      user_serializer.rb
  config/
    routes.rb
    initializers/
      devise.rb
      cors.rb
  db/
    migrate/
    schema.rb
  bin/
    setup
    rails
    rubocop
    brakeman
    bundler-audit
    ci
```

## Setup

### Prerequisites

- Ruby compatible with Rails `~> 8.1.3`
- Bundler
- PostgreSQL running locally

### Install Dependencies

```bash
cd scoopy-api
bundle install
```

### Database

```bash
bundle exec rails db:create db:migrate
```

If the database already exists:

```bash
bundle exec rails db:migrate
```

### Start the Server

```bash
bundle exec rails server
```

Default URL: `http://localhost:3000`

## Environment and Configuration

- JWT secret is configured in this order:
  - `Rails.application.credentials.devise_jwt_secret_key`
  - `DEVISE_JWT_SECRET_KEY`
  - `Rails.application.secret_key_base`
- CORS currently allows frontend local origins:
  - `http://localhost:5137`
  - `http://127.0.0.1:5137`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- `Authorization` header is exposed in CORS.

## Authentication and Users

User auth uses Devise JSON controllers under `users/`.

### Register User

- `POST /users`

Request example:

```json
{
  "user": {
    "email": "user@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }
}
```

Success response (`201 Created`):

```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Sign In

- `POST /users/sign_in`

Request example:

```json
{
  "user": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

Success response (`200 OK`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  },
  "token": "<jwt-token>"
}
```

### Sign Out

- `DELETE /users/sign_out`
- Requires bearer token.
- Success response: `204 No Content`

### JWT Behavior

- Token dispatch on `POST /users/sign_in`
- Token revocation on `DELETE /users/sign_out`
- Expiration: 24 hours
- Revoked tokens are stored in `jwt_denylist`

## Authorization

All product endpoints require authentication via:

```http
Authorization: Bearer <jwt-token>
```

In controller terms, `ProductsController` is protected with `authenticate_user!`.

## API Routes

Defined in `config/routes.rb`:

- `POST /users`
- `POST /users/sign_in`
- `DELETE /users/sign_out`
- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`
- `PUT /products/:id`
- `DELETE /products/:id`
- `GET /products/:id/price_history`
- `GET /products/:id/incidents`

## Product Endpoints

### GET /products

Returns product list with minimal shape:

```json
[
  {
    "id": "6557acf5-4087-4e67-afe5-6ec343ba4ad4",
    "name": "prueba1"
  }
]
```

Supported query params:

- `filter` only

Search behavior:

- Trimmed before use
- Case-insensitive match using `ILIKE`
- Safe wildcard handling with SQL-like escaping

Example:

- `GET /products?filter=nutella`

Unsupported params behavior:

- Any query key different from `filter` returns `400 Bad Request` with:

```json
{
  "error": "unsupported parameter"
}
```

### GET /products/:id

Returns a single product plus `providers_products`:

```json
{
  "id": "6557acf5-4087-4e67-afe5-6ec343ba4ad4",
  "name": "prueba1",
  "providers_products": [
    {
      "id": 1,
      "ssn": "ABC123",
      "provider_name": "Provider A"
    }
  ]
}
```

### POST /products

Creates product and nested provider links:

```json
{
  "product": {
    "name": "prueba1",
    "providers_products_attributes": [
      {
        "ssn": "ABC123",
        "provider_id": 1
      }
    ]
  }
}
```

### PATCH /products/:id

Partial update.

- Updates provided fields.
- Can append or modify nested `providers_products_attributes`.
- Does not automatically clear existing nested rows.

### PUT /products/:id

Replace-style update for nested providers.

- Existing `providers_products` are cleared before update.
- Send the full desired nested state in request body.

### DELETE /products/:id

Deletes product and dependent records:

- `providers_products`
- `price_histories`

### GET /products/:id/price_history

Returns product identity and sorted history (newest first):

```json
{
  "id": "6557acf5-4087-4e67-afe5-6ec343ba4ad4",
  "name": "prueba1",
  "price_history": [
    {
      "price": 9.92,
      "currency": "EUR",
      "created_at": "2026-07-05T14:05:30.310Z",
      "provider_name": "Provider A"
    }
  ]
}
```

### GET /products/:id/incidents

Returns open scraper incidents for the product (newest first):

```json
[
  {
    "id": 1,
    "product_id": "6557acf5-4087-4e67-afe5-6ec343ba4ad4",
    "provider_id": 1,
    "status": "open",
    "created_at": "2026-08-08T10:00:00.000Z",
    "updated_at": "2026-08-08T10:00:00.000Z",
    "provider_name": "Provider A"
  }
]
```

## Data Model Summary

- `Product` has many `providers_products` and `price_histories`.
- `Provider` has many `providers_products`.
- `ProvidersProduct` belongs to `product` and `provider`.
- `PriceHistory` belongs to `product` and `provider` (foreign key `provider_id`).
- `ScraperIncident` belongs to `product` and `provider`; tracks scraper health per pair with `status` (`open`/`resolved`).
- `User` authenticates with Devise JWT and uses `JwtDenylist` for revocation.

## Example Authenticated Requests

Sign in and store token:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/users/sign_in \
  -H "Content-Type: application/json" \
  -d '{"user":{"email":"user@example.com","password":"password123"}}' | jq -r '.token')
```

List products:

```bash
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer $TOKEN"
```

Search products:

```bash
curl -X GET "http://localhost:3000/products?filter=gel" \
  -H "Authorization: Bearer $TOKEN"
```

## Contributing

### 1. Create a Branch

From repository root:

```bash
git checkout -b <type>/<short-description>
```

Example:

```bash
git checkout -b feat/products-search-docs
```

### 2. Make and Validate Changes

Inside `scoopy-api/`:

```bash
bundle exec rails test
bin/rubocop
bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error
bin/bundler-audit
```

Or run the full project CI script:

```bash
bin/ci
```

### 3. Keep Documentation Updated

If behavior changes, update:

- Endpoint docs
- Request/response examples
- Authentication notes
- CORS or env var notes

### 4. Open Pull Request

PR should include:

- Clear summary of changes
- Any API contract changes
- Testing evidence (commands run + results)
- Migration notes if schema changed

## Pull Request Checklist (API)

- [ ] Branch is up to date with `dev`
- [ ] `bundle exec rails test` passes
- [ ] `bin/rubocop` passes
- [ ] `bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error` passes
- [ ] `bin/bundler-audit` passes
- [ ] `bin/ci` passes (recommended)
- [ ] Endpoints and examples in this README are updated
- [ ] Auth-protected routes were tested with and without token
- [ ] Product search (`GET /products?filter=...`) was verified manually

## Notes

- API responses are JSON by default in the documented routes.
- `provider_id` in nested product payloads must exist in `providers`.
- This service is API-first and intended to be consumed by frontend and/or automation clients.
