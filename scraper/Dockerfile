# syntax=docker/dockerfile:1

ARG PLAYWRIGHT_VERSION=1.61.1

# Playwright image ships the Chromium/browser OS dependencies the scraper needs.
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx tsc -p tsconfig.json

FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy
WORKDIR /app
ENV NODE_ENV=production

# verifier.ts launches Chromium headed (headless: false) for anti-bot evasion,
# so it needs a virtual display to run inside a container.
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y xvfb && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY package.json package-lock.json ./
# NODE_ENV=production makes npm skip devDependencies by default; @playwright/test
# is a devDependency but is required at runtime by the batch processor.
RUN npm ci --include=dev

COPY --from=build /app/dist ./dist
COPY docker/run-batch.sh ./docker/run-batch.sh
RUN chmod +x ./docker/run-batch.sh

CMD ["./docker/run-batch.sh"]
