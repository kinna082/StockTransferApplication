using StockTransfer.Domain;

namespace StockTransfer.Application;

public record TransferItemDto(string ProductCode, string ProductName, decimal Quantity);

public record BranchDto(int Id, string BranchCode, string BranchName);
public record ProductDto(int Id, string ProductCode, string ProductName);
public record StatusDto(int Id, string StatusName);
public record CreateProductRequest(string ProductCode, string ProductName);

public record LoginRequest(string Email, string Password);

public record LoginResponse(string AccessToken, string RefreshToken, string Role, int UserId, int? BranchId, string Name);

public record RefreshTokenRequest(string RefreshToken);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record CreateUserRequest(string FullName, string Email, string Password, string RoleName, int BranchId);
public record UpdateUserRequest(string FullName, string Email, string RoleName, int BranchId, string? NewPassword);
public record UserDto(int Id, string FullName, string Email, string RoleName, int BranchId, string BranchName);

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
