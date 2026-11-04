# Product Catalog

A product management application: an **ASP.NET Core Web API** with full CRUD and stock operations for products, and an **Angular** frontend that consumes it.

| Layer | Technology |
|---|---|
| API | ASP.NET Core (.NET 10), controllers, ProblemDetails, OpenAPI + Scalar |
| Data | Entity Framework Core 10, SQL Server (LocalDB), code-first migrations, seeding |
| Frontend | Angular 22 (standalone components, signals, zoneless), Angular Material |
| Tests | xUnit (10 integration tests), Vitest (28 unit tests) |

## Getting started

There are two ways to run the project: **Docker** (nothing to install except Docker) or a **local development setup**.

### Option 1: Docker (any OS)

With [Docker](https://www.docker.com/products/docker-desktop/) installed, from the repository root:

```bash
docker compose up --build
```

Then open **http://localhost:8080**.

This starts SQL Server and the application. The app waits until the database is healthy, then applies the migrations and seeds the sample data. The first build takes a few minutes.

- Stop with `docker compose down` (add `-v` to also delete the database).
- If port 8080 is already in use, change the first number in `docker-compose.yml` (for example `"5000:8080"`) and open http://localhost:5000 instead.
- The container runs in Production mode, so Scalar and the OpenAPI document aren't exposed. Use the local setup to browse the API docs.

### Option 2: Local development

#### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 22.22+ or 24.15+
- SQL Server **LocalDB** (installed with Visual Studio's *ASP.NET and web development* workload)
- Optional: Visual Studio 2026

The first time, trust the ASP.NET Core development certificate (both the API and the Angular dev server use HTTPS):

```bash
dotnet dev-certs https --trust
```

#### Run with Visual Studio

1. Open `ProductCatalog.slnx`.
2. Right-click the solution → **Configure Startup Projects** → **Multiple startup projects**, and set both **ProductCatalog.Server** and **productcatalog.client** to **Start**.
3. Press **Ctrl + F5**.

The app opens at **https://localhost:65117**.

#### Run from the command line

```bash
cd productcatalog.client
npm install
cd ..
dotnet run --project ProductCatalog.Server --launch-profile https
```

Then open **https://localhost:65117**.

On the first run in Development, the API **creates the database, applies the migrations and seeds sample data** (4 categories, 12 products). No manual database step is needed.

#### Without LocalDB (macOS, Linux)

Run only SQL Server in Docker, and point the API at it with an environment variable. No code changes are needed: the variable overrides the connection string in `appsettings.json`, and the database is created and seeded on startup as usual.

1. Start SQL Server:

   ```bash
   docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Your_password123" \
     -p 1433:1433 -d --name productcatalog-sql mcr.microsoft.com/mssql/server:2022-latest
   ```

2. Wait until it's ready (10–30 seconds). Otherwise the API can't connect and stops on startup:

   ```bash
   docker logs -f productcatalog-sql
   ```

   When *"SQL Server is now ready for client connections"* appears, press **Ctrl + C**.

3. Set the connection string and run the API.

   macOS / Linux:

   ```bash
   export ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=ProductCatalogDb;User Id=sa;Password=Your_password123;TrustServerCertificate=True"
   dotnet run --project ProductCatalog.Server --launch-profile https
   ```

   Windows (PowerShell):

   ```powershell
   $env:ConnectionStrings__DefaultConnection = "Server=localhost,1433;Database=ProductCatalogDb;User Id=sa;Password=Your_password123;TrustServerCertificate=True"
   dotnet run --project ProductCatalog.Server --launch-profile https
   ```

On Apple Silicon Macs, the SQL Server image runs through emulation: enable *Use Rosetta for x86_64/amd64 emulation* in Docker Desktop's settings.

The backend tests still need LocalDB (see [Possible next steps](#possible-next-steps)).

### API documentation

While the API runs in Development:

- **Scalar** (interactive docs): https://localhost:7054/scalar
- **OpenAPI document**: https://localhost:7054/openapi/v1.json
- **`ProductCatalog.Server/ProductCatalog.Server.http`**: ready-made requests for every endpoint, runnable from Visual Studio.

## Running the tests

```bash
# Backend: 10 xUnit integration tests (needs LocalDB)
dotnet test

# Frontend: 28 Vitest unit tests
cd productcatalog.client
npx ng test --watch=false
```

The backend tests run against a **real SQL Server database**: each test class creates a throwaway LocalDB database with a random name, applies the migrations, and deletes it afterwards. This tests the actual SQL behaviour (sequence IDs, atomic stock updates, concurrency), which an in-memory provider can't reproduce.

## API

| Method | Route | Description | Responses |
|---|---|---|---|
| GET | `/api/products` | All products, ordered by name | 200 |
| GET | `/api/products/{id}` | One product | 200, 404 |
| POST | `/api/products` | Create a product | 201, 400 |
| PUT | `/api/products/{id}` | Update name, description, price and category | 200, 400, 404 |
| DELETE | `/api/products/{id}` | Delete a product | 204, 404 |
| POST | `/api/products/{id}/decrement-stock/{quantity}` | Remove stock | 200, 400, 404, 409 |
| POST | `/api/products/{id}/add-to-stock/{quantity}` | Add stock | 200, 400, 404 |
| GET | `/api/products/search?name={name}` | Partial, case-insensitive name search | 200, 400 |
| GET | `/api/products/stock-level?min={min}&max={max}` | Products with stock in a range (inclusive) | 200, 400 |
| GET | `/api/categories` | All categories | 200 |

Every product in every response includes its `stockQuantity`. Errors use the **ProblemDetails** format (RFC 9457).

### Validation rules

| Field | Rule |
|---|---|
| `name` | required, 2–100 characters, not only whitespace |
| `description` | optional, up to 1000 characters |
| `price` | required, 0.01 – 5,000,000 |
| `stockQuantity` | required on create, 0 – 1,000,000 |
| `categoryId` | required, must exist |
| `quantity` (stock endpoints) | 1 – 1,000,000 |

The same rules are enforced in three places: the API (Data Annotations), the database (column lengths and check constraints) and the Angular forms (for immediate feedback).

## Design decisions

### Unique 6-digit IDs across multiple instances

Product IDs come from a **SQL Server sequence** (`ProductIdSequence`) that starts at **100000** and ends at **999999**. The database hands out each value exactly once, so IDs stay unique even with several API instances running at the same time, without locks or coordination in the application. Starting at 100000 keeps every ID a true 6-digit number.

Trade-offs: the range holds 900,000 IDs, and values are never reused, so deleted products or rolled-back inserts leave gaps. This is normal for sequences and harmless for an identifier.

### Stock changes are atomic, and separate from updates

- **`PUT` does not change stock.** If it did, two users editing the same product could overwrite each other's stock change (a *lost update*). Stock only changes through the dedicated endpoints.
- **The stock endpoints update in a single SQL statement** (`ExecuteUpdateAsync`). Decrementing only succeeds `WHERE StockQuantity >= quantity`, so stock can **never go negative, even under concurrent requests**. A test fires parallel decrements to prove it never oversells.
- If there isn't enough stock, the API returns **409 Conflict** and leaves the stock unchanged. A database **check constraint** (`StockQuantity >= 0`) is the last line of defence.
- The stock endpoints return the **updated product**, so the UI refreshes without an extra request.

### Categories

The spec allows extra fields and relationships, so products belong to a **Category** (a one-to-many relationship). It makes the data more realistic and the UI more useful. A category with products can't be deleted (`DeleteBehavior.Restrict`).

### Layered backend

Requests flow through **Controller → Service → Repository → Database**, and each layer has one job:

| Layer | Responsibility | Knows about |
|---|---|---|
| **Controller** | HTTP: routes, status codes, input validation | services and DTOs |
| **Service** | business rules: trimming input, checking the category exists, deciding between "not found" and "insufficient stock", timestamps, logging | repository interfaces, entities, DTOs |
| **Repository** | data access: EF Core queries and atomic SQL updates | `AppDbContext` and entities |

- **Services don't depend on EF Core**, only on repository interfaces (`IProductRepository`, `ICategoryRepository`), so business rules and data access stay separate.
- **Repositories have intention-revealing methods** (`TryDecrementStockAsync`, `GetByStockLevelAsync`) rather than a generic CRUD interface, so EF Core features such as `ExecuteUpdateAsync` stay available where they matter. The atomic stock update lives in the repository, because atomicity is a data-access guarantee; what a failed decrement *means* (404 or 409) is decided in the service.
- **Repositories return entities; services map them to DTOs**, so the database shape never leaks into the API contract.
- **A global exception handler** turns business-rule exceptions into 400 or 409 responses, and anything unexpected into a generic 500 that doesn't expose internal details.
- **Migrations are applied at startup** in Development, or when `Database:ApplyMigrationsOnStartup` is `true` (as in `docker-compose.yml`). In a real production deployment they would run as a pipeline step instead.

### Why a repository layer

The first version of the services used EF Core's `DbContext` directly. That's a common .NET approach, since `DbContext` already implements the Repository and Unit of Work patterns. It was refactored to add repositories for three reasons:

- **Cleaner separation of concerns.** With `DbContext` in the services, every method mixed business rules with query code. Now the services read as business logic only, and each entity's queries live in one place.
- **The business layer no longer depends on EF Core.** Services only know repository interfaces, so how data is stored can change without touching the business rules.
- **It's the layering most teams expect** (Controller → Service → Repository → Database), which makes the code easier to navigate for anyone joining the project.

Trade-offs accepted:

- More code: an interface and a class per entity.
- Reads load full entities (with their category) instead of selecting only the columns the DTO needs. The difference is negligible at this size, and a dedicated read query could be added if it ever mattered.
- The backend tests remain integration tests against SQL Server: the concurrency guarantees are enforced by the database, so a fake repository couldn't prove them.

### Frontend

- **Feature-based structure:** `core/` (models, API services, interceptor), `features/products/` (list, form, stock dialog), `shared/` (confirm dialog).
- **Signals for state, no global store.** Each page owns its state, and nothing is shared between pages, so NgRx or similar would add complexity without benefit.
- **The filters form one reactive pipeline** (signals → `toObservable` → `debounceTime` → `switchMap`): typing fires one request after a pause, and an outdated response can never overwrite a newer one.
- **Combined name and stock filters:** the API has no endpoint that takes both, so the app calls `search` and applies the stock range in the browser. With a single filter, it uses the matching endpoint directly.
- **Reactive forms** mirror the server's validation rules, and server validation errors are shown under the matching field.
- **Waiting for the API at startup:** in development, the dev-server proxy (`proxy.conf.js`) holds `/api` requests until the API accepts connections, so the first page load doesn't fail while the API is still applying migrations.
- **Retry interceptor:** GET requests are retried with increasing delays on network errors and 502/503/504, covering brief outages such as the API restarting or a deployment in progress. Other methods are never retried, so a product can't be created twice.
- **Angular Material** for components, theming and accessibility. The product table is a plain `<table>` with `@for`, which keeps the template fully type-checked (sorting and pagination, the main reasons for `mat-table`, aren't needed here).

### No CORS configuration

The browser only ever talks to one origin: in development, the Angular dev server proxies `/api` to the API (`proxy.conf.js`), and in production the API serves the built Angular files itself. CORS would only be needed if the frontend were hosted on a different domain.

## Possible next steps

- Authentication and authorization
- Pagination and server-side sorting for large catalogs
- Optimistic concurrency on `PUT` (a `rowversion` column), so concurrent edits are detected instead of last-write-wins
- Running the backend tests against a SQL Server container, so they also run on macOS and Linux and in CI

## Project structure

```
ProductCatalog.slnx
├── Dockerfile                       builds Angular and the API into one image
├── docker-compose.yml               SQL Server + the application
├── ProductCatalog.Server/           ASP.NET Core Web API
│   ├── Controllers/                 HTTP endpoints
│   ├── Services/                    business logic
│   ├── Repositories/                data access (EF Core queries)
│   ├── Data/                        DbContext, entity configurations, seeding
│   ├── Entities/                    database models
│   ├── Dtos/                        API request and response models
│   ├── Mappings/                    entity → DTO mapping
│   ├── Exceptions/                  business-rule exceptions
│   ├── ErrorHandling/               global exception → ProblemDetails
│   └── Migrations/                  EF Core migrations
├── ProductCatalog.Server.Tests/     xUnit integration tests
└── productcatalog.client/           Angular application
    └── src/app/
        ├── core/                    models, API services, retry interceptor
        ├── features/products/       product list, form and stock dialog
        └── shared/                  reusable confirm dialog
```
