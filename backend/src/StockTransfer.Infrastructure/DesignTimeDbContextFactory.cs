using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace StockTransfer.Infrastructure;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<StockTransferDbContext>
{
    public StockTransferDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<StockTransferDbContext>();
        var connectionString = "Server=localhost;Database=StockTransferDb;Trusted_Connection=True;TrustServerCertificate=True;";
        optionsBuilder.UseSqlServer(connectionString);
        return new StockTransferDbContext(optionsBuilder.Options);
    }
}
