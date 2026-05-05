# Backend Setup

## Projects

- `StockTransfer.Api` - HTTP API endpoints
- `StockTransfer.Application` - DTOs and business use cases
- `StockTransfer.Domain` - entities and status model
- `StockTransfer.Infrastructure` - EF Core and data access

## Run

From `backend`:

1. `dotnet restore StockTransfer.sln`
2. `dotnet build StockTransfer.sln`
3. `dotnet run --project src/StockTransfer.Api/StockTransfer.Api.csproj`

Default API URL:

- `http://localhost:5080`

## Auth Seed Users

- Admin: `admin@store.com` / `Admin@123`
- Store Manager: `manager@store.com` / `Manager@123`
- Seeded plaintext passwords are automatically converted to BCrypt hashes on first API startup.

## Auth Endpoints

- `POST /api/auth/login` -> returns access + refresh token
- `POST /api/auth/refresh` -> rotates refresh token and returns new tokens
- `POST /api/auth/logout` -> revokes current refresh token

## EF Core Migrations

From `backend/src/StockTransfer.Infrastructure`:

1. `dotnet ef migrations add InitialCreate --startup-project ../StockTransfer.Api --context StockTransferDbContext`
2. `dotnet ef database update --startup-project ../StockTransfer.Api --context StockTransferDbContext`
