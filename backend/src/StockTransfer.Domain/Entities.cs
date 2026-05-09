namespace StockTransfer.Domain;

public enum TransferStatus
{
    Submitted = 1,
    Inprogress = 2,
    Completed = 3
}

public class StockTransferHeader
{
    public Guid Id { get; set; }
    public string TransferNo { get; set; } = string.Empty;
    public int SourceBranchId { get; set; }
    public int DestinationBranchId { get; set; }
    public DateOnly TransferDate { get; set; }
    public TransferStatus Status { get; set; } = TransferStatus.Submitted;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<StockTransferItem> Items { get; set; } = new();
}

public class StockTransferItem
{
    public Guid Id { get; set; }
    public Guid TransferId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
}

public class Branch
{
    public int Id { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
}

public class Product
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
}

public class StatusMaster
{
    public int Id { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AppUser
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public int? BranchId { get; set; }
}

public class RefreshToken
{
    public Guid Id { get; set; }
    public int UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
}
