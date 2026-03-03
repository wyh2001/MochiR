# MochiR

A general-purpose, self-hosted web application for building review and rating sites, with configurable subject types and rating criteria.

## Tech Stack

- **Backend:** .NET 9 / ASP.NET Core, Entity Framework Core, PostgreSQL
- **Frontend:** Angular 21, TypeScript, Bootstrap 5
- **Auth:** ASP.NET Core Identity
- **API Docs:** OpenAPI + Scalar

## Getting Started

### Prerequisites

- .NET 9 SDK
- Node.js 20.19+ / 22.12+ / 24+
- PostgreSQL 18

### Database

```bash
docker run -d --name mochir-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=MochiR \
  postgres:18
```

Then set `UseInMemory` to `false` in `appsettings.Development.json` and apply migrations:

```bash
dotnet ef database update --project MochiR.Api
```

> Without PostgreSQL, the app falls back to an in-memory database (`UseInMemory: true`), but features like full-text search will be unavailable.

### Backend

```bash
dotnet run --project MochiR.Api
```

API available at `http://localhost:5261`. Interactive docs at `http://localhost:5261/scalar`.

### Frontend

```bash
cd MochiR.Client
npm install
npm run api:generate
npm start
```

App available at `http://localhost:4200`.

> **Note:** The frontend remains a bare-bones prototype for now.

### Tests

```bash
dotnet test
cd MochiR.Client && npm test
```

## License

[MIT](LICENSE.txt)
