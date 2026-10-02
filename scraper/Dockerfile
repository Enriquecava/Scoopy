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

COPY package.json package-lock.json ./
# @playwright/test is a devDependency but is required at runtime by the batch processor.
RUN npm ci

COPY --from=build /app/dist ./dist
COPY docker/run-batch.sh ./docker/run-batch.sh
RUN chmod +x ./docker/run-batch.sh

CMD ["./docker/run-batch.sh"]
