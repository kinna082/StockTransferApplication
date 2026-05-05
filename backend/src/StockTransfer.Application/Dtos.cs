using StockTransfer.Domain;

namespace StockTransfer.Application;

public record TransferItemDto(string ProductCode, string ProductName, decimal Quantity);

public record BranchDto(int Id, string BranchCode, string BranchName);

public record LoginRequest(string Email, string Password);

public record LoginResponse(string AccessToken, string RefreshToken, string Role, int UserId, int? BranchId, string Name);

public record RefreshTokenRequest(string RefreshToken);

public record CreateTransferRequest(
    int SourceBranchId,
    int DestinationBranchId,
    DateOnly TransferDate,
    List<TransferItemDto> Items
);

public record TransferDto(
    Guid Id,
    string TransferNo,
    int SourceBranchId,
    int DestinationBranchId,
    DateOnly TransferDate,
    TransferStatus Status,
    DateTime CreatedAt,
    List<TransferItemDto> Items
);

public record PagedResult<T>(int Page, int PageSize, int TotalCount, List<T> Items);
