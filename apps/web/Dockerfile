FROM node:24-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV WEB_PORT=3000

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/audit/package.json packages/audit/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/retrieval/package.json packages/retrieval/package.json
COPY packages/testing/package.json packages/testing/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @support/web build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @support/web exec next start --hostname 0.0.0.0 --port ${WEB_PORT:-3000}"]
