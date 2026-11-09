# Product presentations and catalogs

Products retain their required name and can optionally reference a brand and a
category. Administrators manage the brand, category and measurement catalogs in
the administration page. Used catalog entries cannot be deleted.

A product has one or more presentations. A presentation can have a positive
quantity (stored in `units`) and a measurement (`unit_measures`), or neither
when the quantity is unknown. Quantities are not inferred from product names.
Administrators manage presentations and provider listings from product detail.
A presentation with listings, prices or incidents cannot be deleted.

Each provider listing has a stable ID and belongs to a presentation. The
provider and SSN combination is unique, but a provider can have several
listings for the same product. Prices and incidents record both the listing and
the presentation. When an administrator moves a listing to another
presentation, its prices and incidents are moved with it.

## Migration and legacy data

The migration creates an unknown-quantity presentation for each existing
product and assigns existing listings to it. Existing prices and incidents
are matched to listings using both product and provider. Records with no
matching listing retain their product, provider, and unknown presentation, but
have no listing ID. Administrators can associate these records with the
correct listing of the same provider from product detail.

The migration is irreversible because the previous schema cannot represent
multiple listings for one provider and product. Back up the database before
deploying. A rollback after migration requires restoring that backup; keeping
the old product and provider columns does not make the migration reversible.
Deploy the API and scraper together: the old scraper does not write the new
required presentation ID.

## API

- `GET /brands`, `/categories`, `/unit_measures`: authenticated catalog reads.
- `POST`, `PATCH /:id`, `DELETE /:id` on those paths: admin catalog management.
- `POST /products/:product_id/presentations` and `PATCH` or `DELETE` on
  `/products/:product_id/presentations/:id`: admin presentation management.
  Supply `{ "presentation": { "value": 120, "unit_measure_id": 1 } }`, or
  set both fields to null for an unknown quantity.
- `POST /products/:product_id/provider_listings` and `PATCH` on
  `/products/:product_id/provider_listings/:id`: admin listing management.
- `POST /products/:product_id/provider_listings/:id/legacy/:record_type/:record_id`
  associates an orphan record (`prices` or `incidents`) with a listing from
  the same product and provider.
- Product detail, price-history and incident responses include presentation
  and listing IDs. The product creation payload remains unchanged.

The scraper batch processes every listing separately. CLI lookup accepts an SSN
and optionally a provider ID; if an SSN exists at several providers, the
provider ID is required.
