using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace StockTransfer.Infrastructure;

/// <summary>
/// Used only by EF Core CLI (<c>dotnet ef</c>). The running API reads the connection string from
/// configuration in <c>StockTransfer.Api</c> (<see cref="Microsoft.Extensions.Configuration"/>), not from this class.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<StockTransferDbContext>
{
    public StockTransferDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<StockTransferDbContext>();

        // Same env key shape as Azure App Service / appsettings.json for local "dotnet ef" runs.
        var connectionString =
            Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Database=StockTransferDB;Trusted_Connection=True;TrustServerCertificate=True;";

        optionsBuilder.UseSqlServer(connectionString);
        return new StockTransferDbContext(optionsBuilder.Options);
    }
}
