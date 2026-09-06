# Admin Features

This document describes the authorization model and administrator interfaces in Scoopy. The backend is the authoritative security boundary; frontend restrictions only keep unavailable actions out of the user experience.

## Implementation Goal

Scoopy supports authenticated standard users and administrators. Both roles can use the product and provider features, while administrators can manage products and create standard users.

## User Role Model

Users are authenticated with Devise and JWT. The `role` enum supports `user` and `admin`, defaulting to `user`. The sign-in response includes the authenticated user's role, which the frontend stores with the session token.

User creation is administrator-only and always assigns the `user` role. There is no frontend or API option to create an administrator.

## Permissions Matrix

| Capability | User | Admin |
| --- | --- | --- |
| View products | Yes | Yes |
| Verify products | Yes | Yes |
| Create products | Yes | Yes |
| View providers | Yes | Yes |
| View price history | Yes | Yes |
| View incidents | Yes | Yes |
| View screenshots | Yes | Yes |
| Modify products | No | Yes |
| Delete products | No | Yes |
| Create users | No | Yes |
| Create administrators | No | No |

## Devise Integration

Devise handles password authentication and JWT issues the bearer token during `POST /users/sign_in`. The session response contains:

```json
{
  "user": { "id": 1, "email": "admin@example.com", "role": "admin" },
  "token": "<jwt>"
}
```

All protected requests send `Authorization: Bearer <jwt-token>`.

## Endpoint Behavior

- `POST /users` requires an authenticated admin and creates a regular user from `email`, `password`, and `password_confirmation`.
- `PATCH /products/:id` and `PUT /products/:id` require an authenticated admin. Product names and provider SSNs can be updated through nested provider attributes.
- `DELETE /products/:id` requires an authenticated admin and returns `204 No Content` on success.
- Product creation, verification, provider reads, history, incidents, and screenshots remain available to authenticated users.
- Unauthenticated requests return `401 Unauthorized`; authenticated users without the required role receive `403 Forbidden`.

## Frontend Restrictions

The auth provider exposes `role` and the main navigation only shows the administration page to admins. Product edit and delete controls are rendered only for admins. The `/admin` route also redirects non-admin users back to the products page.

These restrictions are presentation logic, not authorization. The frontend handles `401` by clearing the session and handles `403` as a permission error without treating it as a login failure.

## Administrator Provisioning

The first administrator must be provisioned through the backend or a controlled database/console operation. Once an administrator can sign in, they can create regular users from the Administration page. The page deliberately has no role selector.

## Testing Requirements

Backend tests should cover:

- unauthenticated access returning `401`;
- regular users receiving `403` for user creation, product updates, and product deletion;
- administrators creating users with the forced `user` role;
- administrator product updates, including provider SSNs;
- administrator product deletion;
- serializer responses containing the user role.

Frontend tests should cover role-based visibility, the protected admin route, session clearing on `401`, permission feedback on `403`, successful user creation, product updates, and deletion feedback.
