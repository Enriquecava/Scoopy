# Druni Tenant Guide

This guide explains the Druni search flow and how to locate the product reference used by the scraper.

## Identifier Used

Druni is searched using the product reference stored in `providers_products.ssn`.

The scraper enters that value into Druni's search field, submits the search, and then reads the current price from the search results page.

## How the Scraper Finds the Product

The flow is:

1. Open `https://www.druni.es/`.
2. Reject the cookie prompt.
3. Open the search area.
4. Type the product reference.
5. Submit the search with `Enter`.
6. Read the current price from the search results.

The relevant selectors are:

- Search entry point: `#search-input`
- Search input: `input[type="search"]`
- Search button: `[data-test="search-button"]`
- Current price: `[data-test="result-current-price"]`

## Ways to Find the Reference

Common ways to identify the Druni reference are:

1. By searching the product on Druni so just 1 option appear.
2. Open the inspector and search for sku.
3. There will be a `<script>` with the product information.
4. Copy the sku value

## Notes

- The scraper currently reads the first current-price result returned by the search results page.
- If Druni changes the search markup, the `data-test` attributes will likely need to be updated.