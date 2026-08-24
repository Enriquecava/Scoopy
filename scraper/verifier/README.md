# Verifier

This folder contains the provider-specific verifier flows used to confirm that a product can be found in the tenant website and to capture a screenshot of the matched result.

## Purpose

The verifier is useful when you want visual confirmation that a product identifier is still valid in a provider storefront.

Input:
- `provider_id` (numeric tenant id)
- `ssn` (provider product identifier used by that tenant)

Output:
- `Promise<Buffer>` with a PNG screenshot of the matched product card/result.

## Entry Point

Main function: `verifyProductExist(provider_id: number, ssn: string): Promise<Buffer>`

Defined in:
- `scraper/function/verifier.ts`

Provider implementations in this folder:
- `amazon.ts`
- `carrefour.ts`
- `druni.ts`
- `elCorteIngles.ts`
- `primor.ts`

## Provider Mapping

The verifier resolves the provider implementation using these ids:

| Provider | provider_id |
| --- | --- |
| Amazon | 1 |
| Carrefour | 2 |
| Primor | 3 |
| Druni | 4 |
| El Corte Ingles | 5 |

## How It Works

1. Validates that `ssn` is present.
2. Selects the provider verifier from the provider map.
3. Launches a Playwright Chromium browser.
4. Creates a browser context with anti-bot oriented defaults (user-agent, headers, webdriver override).
5. Fetches the provider base URL from PostgreSQL (`providers.url`).
6. Runs the provider-specific search flow.
7. Returns the screenshot as a `Buffer`.
8. Always closes the browser in `finally`.

## Environment and Data Requirements

Required database environment variables:
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`

Required DB data:
- The provider must exist in `providers` with a valid `url`.
- The `provider_id` passed to the function must be one of the supported ids.

## Logging

Verifier structured log events are exposed through `VERIFIER_LOG_EVENT` in `scraper/utils/logger.ts`.

Main events:
- `verifier.verification.started`
- `verifier.verification.image_obtained`
- `verifier.verification.failed`
- `verifier.provider.failed_to_get_url`
- `verifier.input.invalid_product`
- `verifier.provider.unsupported`

You can persist logs with:
- `SCRAPER_LOG_FILE=/path/to/verifier.log`

## Run It Manually

There is currently no dedicated CLI wrapper in `scraper/function/verifier.ts`; the file exports the verifier function. You can execute it from the repository root with `tsx` and write the image to disk:

```bash
npx tsx -e "import { writeFileSync } from 'node:fs'; import { verifyProductExist } from './scraper/function/verifier.ts'; const image = await verifyProductExist(4, '2611823'); writeFileSync('./scraper/logs/verifier-druni-2611823.png', image);"
```

This creates a screenshot file under `scraper/logs/` that you can inspect manually.

## Common Failures

- `SSN is required`: empty or blank `ssn`.
- `Unsupported provider_id`: provider id is not in the mapping.
- Provider URL fetch failure: missing/invalid provider row in `providers`.
- Selector errors/timeouts: tenant page structure changed and the provider verifier/page objects need updates.
