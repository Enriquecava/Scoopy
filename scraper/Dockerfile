# syntax=docker/dockerfile:1

ARG PLAYWRIGHT_VERSION=1.61.1
ARG NODE_MAJOR=26

# Playwright image ships the Chromium/browser OS dependencies the scraper needs.
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy AS build
ARG NODE_MAJOR
WORKDIR /app

# package.json requires Node >=26.5; the Playwright image's bundled Node may be older.
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y ca-certificates curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - && \
    apt-get install --no-install-recommends -y nodejs && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx tsc -p tsconfig.json

FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy
ARG NODE_MAJOR
WORKDIR /app
ENV NODE_ENV=production

# verifier.ts launches Chromium headed (headless: false) for anti-bot evasion,
# so it needs a virtual display to run inside a container. Also replaces the
# image's bundled Node with the version package.json's engines.node requires.
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y xvfb ca-certificates curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - && \
    apt-get install --no-install-recommends -y nodejs && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY package.json package-lock.json ./
# NODE_ENV=production makes npm skip devDependencies by default; @playwright/test
# is a devDependency but is required at runtime by the batch processor.
RUN npm ci --include=dev

COPY --from=build /app/dist ./dist
COPY docker/run-batch.sh ./docker/run-batch.sh
RUN chmod +x ./docker/run-batch.sh

CMD ["./docker/run-batch.sh"]
