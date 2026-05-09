using Microsoft.EntityFrameworkCore;
using StockTransfer.Domain;

namespace StockTransfer.Infrastructure;

public class StockTransferDbContext : DbContext
{
    public StockTransferDbContext(DbContextOptions<StockTransferDbContext> options) : base(options)
    {
    }

    public DbSet<StockTransferHeader> StockTransfers => Set<StockTransferHeader>();
    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StatusMaster> StatusMasters => Set<StatusMaster>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Branch>(entity =>
        {
            entity.ToTable("branches");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.BranchCode).HasColumnName("branch_code");
            entity.Property(x => x.BranchName).HasColumnName("branch_name");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ProductCode).HasColumnName("product_code");
            entity.Property(x => x.ProductName).HasColumnName("product_name");
        });

        modelBuilder.Entity<StatusMaster>(entity =>
        {
            entity.ToTable("status_master");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.StatusName).HasColumnName("status_name");
            entity.Property(x => x.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<StockTransferHeader>(entity =>
        {
            entity.ToTable("stock_transfers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.TransferNo).HasColumnName("transfer_no");
            entity.Property(x => x.SourceBranchId).HasColumnName("source_branch_id");
            entity.Property(x => x.DestinationBranchId).HasColumnName("destination_branch_id");
            entity.Property(x => x.TransferDate).HasColumnName("transfer_date");
            entity.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            entity.Property(x => x.Status)
                .HasColumnName("status_name")
                .HasConversion<string>();

            entity.HasMany(x => x.Items)
                .WithOne()
                .HasForeignKey(x => x.TransferId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StockTransferItem>(entity =>
        {
            entity.ToTable("stock_transfer_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.TransferId).HasColumnName("transfer_id");
            entity.Property(x => x.ProductCode).HasColumnName("product_code");
            entity.Property(x => x.ProductName).HasColumnName("product_name");
            entity.Property(x => x.Quantity).HasColumnName("quantity");
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.FullName).HasColumnName("full_name");
            entity.Property(x => x.Email).HasColumnName("email");
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash");
            entity.Property(x => x.RoleName).HasColumnName("role_name");
            entity.Property(x => x.BranchId).HasColumnName("branch_id");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.TokenHash).HasColumnName("token_hash");
            entity.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.RevokedAt).HasColumnName("revoked_at");
            entity.Property(x => x.ReplacedByTokenHash).HasColumnName("replaced_by_token_hash");
        });
    }
}
