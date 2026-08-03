# Amazon Tenant Guide

This guide explains how the Amazon scraper works and how the product key is located for Amazon items.

## Identifier Used

Amazon uses the ASIN as the main search key.

In practice, the scraper receives the value stored in `providers_products.ssn`, then searches that value in Amazon's search box and looks for a result card with the same `data-asin` attribute.

## How the Scraper Finds the Product

The flow is:

1. Open `https://www.amazon.es/`.
2. Accept the cookie prompt.
3. Fill the top search input with the ASIN.
4. Submit the search.
5. Locate the result item whose `data-asin` matches the searched ASIN.
6. Read the current price from the matching result card.

The relevant selectors are:

- Search input: `#twotabsearchtextbox`
- Search button: `#nav-search-submit-button`
- Result item: `[data-asin="<asin>"][role="listitem"]`
- Price inside the item: `span[data-a-size="xl"][data-a-color="base"].a-price`

## Ways to Find the ASIN

Common ways to identify the Amazon ASIN are:

1. From the product URL, where the ASIN usually appears in the path or query string.
2. From the product detail page HTML or page source.
3. From Amazon search results, where the same ASIN is exposed in the result item attributes.
4. From the internal Scoopy mapping stored in the database when the product has already been linked to Amazon.

## Notes

- The scraper reads the price from the search results page instead of opening a product detail page.
- If several results appear, the scraper only trusts the result whose `data-asin` exactly matches the searched ASIN.
- If Amazon changes the markup, both the result locator and the price selector may need to be updated together.