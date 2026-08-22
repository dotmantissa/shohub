# Shohub

Shohub is a living directory for projects built on Shelby. Builders publish a short introduction, a cover image, and an optional demo video or PDF. Visitors can browse, search, sort, and like the projects that catch their eye.

The important part is underneath the surface. Project media and metadata are uploaded to Shelby storage, while Neon keeps the searchable directory and like counts. Each published project is also registered in the Shohub Move registry on Shelbynet.

## What is included

- A responsive project directory with search, category filters, newest and most liked sorting
- Project detail pages with Shelby served cover images, videos, and PDFs
- Builder profiles with required X handles and Unavatar profile pictures
- Email only sign in through Privy
- Privy embedded Ethereum wallets with the wallet interface hidden from users
- Shelby storage through the Ethereum kit and derived storage accounts
- Abstracted wallet prompts for registry initialization and project registration
- Neon Postgres persistence for builders, projects, and likes
- An Aptos Move registry contract for project ownership and metadata references
- Light and dark colour modes using Shohub's pink, white, and black palette

Shohub does not use sample projects in the application. The home page reflects the projects that have actually been saved to the configured database.

Publishing asks for the builder or team name, X handle, role, team size, location, a short builder introduction, project description, category, and cover image. GitHub, demo, website, social links, and extra media are optional. X handles are normalized and shown as profile pictures through Unavatar on project detail pages.

## How publishing works

1. A builder signs in with email.
2. Privy creates or retrieves the embedded Ethereum wallet without showing wallet management screens.
3. Shelby derives the builder's storage account for Shohub.
4. The cover, optional media, and JSON metadata are uploaded to Shelby.
5. Shohub initializes the builder's registry resource when needed.
6. The project is registered on Shelbynet.
7. Neon stores the searchable project record and transaction hash.

The browser never asks a builder to install a wallet or copy a private key. Users approve the required transaction prompts, and the wallet work stays out of the way.

## Requirements

- Node.js 20 or newer
- pnpm
- Aptos CLI 9.3.0 or a compatible version for the pinned Move framework
- A Privy application configured for email login and embedded Ethereum wallets
- A Shelby API key
- A Neon Postgres database
- A deployed Shohub registry module on Shelbynet

## Local setup

Install dependencies:

```sh
pnpm install
```

Create a local environment file:

```sh
cp .env.example .env
```

Set the values in `.env`:

```sh
VITE_PRIVY_APP_ID=
PRIVY_APP_ID=
PRIVY_APP_SECRET=
NEON_DATABASE_URL=
VITE_SHELBY_API_KEY=
VITE_SHELBY_RPC_URL=https://api.shelbynet.shelby.xyz/shelby
VITE_SHELBY_CHAIN_ID=118
VITE_SHELBY_REGISTRY_ADDRESS=0x995d6f9053cfa36ccbab58c567900a918a4a0b15078bed75195b24c9e43bc8e4
VITE_APP_DOMAIN=shohub.app
```

Apply the database schema to Neon:

```sh
psql "$NEON_DATABASE_URL" -f db/schema.sql
```

Start the development server:

```sh
pnpm dev
```

Then open the local URL printed by Vite.

## Contract development

The registry package is in `contracts`. It is pinned to the Aptos framework release that works with the repository's Aptos CLI.

Run the Move tests:

```sh
pnpm contracts:test
```

Build the package:

```sh
aptos move compile --package-dir contracts
```

The registry is deployed on Shelbynet at `0x995d6f9053cfa36ccbab58c567900a918a4a0b15078bed75195b24c9e43bc8e4`. The publish transaction is `0x0a6a7a35af36f913c0b3136c18756291d6299c372a1f53ecfd5d52c7a7b00272`. The deployment signer is never stored in this repository.

## Verification

Run the application checks:

```sh
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm contracts:test
```

The contract tests cover initialization, safe reads before initialization, project registration, duplicate protection, metadata updates, metadata readback, counter views, missing projects, and input limits.

## Storage notes

Shohub uses Shelby blob names under:

```text
shohub/<project id>/cover.<extension>
shohub/<project id>/media.<extension>
shohub/<project id>/metadata.json
```

Shelby blob URLs are public read URLs on Shelbynet. The metadata JSON is the canonical on chain reference and contains the project fields needed to reconstruct the published asset set.

## Repository layout

```text
contracts/              Move registry package and tests
db/schema.sql           Neon tables, indexes, and like function
public/logo.svg         Shohub mark and browser icon source
src/components/         Product UI and reusable controls
src/hooks/              Shelby and wallet hooks
src/lib/                Server functions, Shelby helpers, auth, and payloads
src/routes/              Home, submit, and project detail pages
```
