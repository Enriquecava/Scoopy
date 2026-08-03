# Carrefour Tenant Guide

This guide explains the Carrefour search flow and the different ways to identify the product reference used by the scraper.

## Identifier Used

Carrefour is searched using the product reference stored in `providers_products.ssn`.

The scraper does not transform this value. It sends the stored reference to Carrefour's search field and expects the tenant search engine to resolve the corresponding product result.

## How the Scraper Finds the Product

The flow is:

1. Open `https://www.carrefour.es/`.
2. Reject the cookie prompt.
3. Click the search bar.
4. Type the reference.
5. Submit the search with `Enter`.
6. Read the current price from the search result card.

The relevant selectors are:

- Search container: `#search-input`
- Search input: `input[type="search"]`
- Search button: `[data-test="search-button"]`
- Current price card: `[data-test="result-current-price"]`

## Ways to Find the Reference

Common ways to identify the Carrefour reference are:

1. By searching the product name on Carrefour.
2. Looking in the url and at the end there should be a code like X-XXXXXXXXX-XXXXXX

## Notes

- The current implementation includes short waits after cookie handling and search actions because Carrefour is sensitive to timing.
- The scraper reads the current result price directly from the search results page.
- If Carrefour changes the search UI, the timing and selectors are the first places to update.