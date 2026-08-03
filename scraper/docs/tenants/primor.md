# Primor Tenant Guide

This guide explains the Primor search flow and the different ways to identify the product reference used by the scraper.

## Identifier Used

Primor is searched using the product reference stored in `providers_products.ssn`.

The scraper sends that value to Primor's search input, submits the search, and reads the visible result price.

## How the Scraper Finds the Product

The flow is:

1. Open `https://www.primor.eu/es_es/`.
2. Close the initial continuation modal by clicking `Continuar`.
3. Click the search input.
4. Type the product reference.
5. Click the search button.
6. Read the visible product price from the results card.

The relevant selectors are:

- Search input: `[data-test="search-input"]`
- Search button: `[data-test="search-button"]`
- Sale price card: `[class="dfd-card-price dfd-card-price--sale"]`
- Regular price card: `[class="dfd-card-price"]`

## Ways to Find the Reference

Common ways to identify the Primor reference are:

1. From the Primor site search for the product so just 1 appear.
2. Open the network tab in the devtools panel.
3. Reload the search page.
4. search for `https://api.empathy.co/search/v1/query/primor/search?`
5. Go to preview
6. Go to catalog > content > element position 
7. And get the sku property value

## Notes

- The scraper prefers the sale price when it exists, and falls back to the regular price otherwise.
- If Primor changes the card structure, both price selectors may need to be adjusted.