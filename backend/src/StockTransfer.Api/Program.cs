using StockTransfer.Application;
using StockTransfer.Domain;
using Microsoft.EntityFrameworkCore;
using StockTransfer.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddDbContext<StockTransferDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "StockTransfer.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "StockTransfer.Frontend";
var jwtKey = builder.Configuration["Jwt:SigningKey"] ?? throw new InvalidOperationException("JWT signing key missing");
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = signingKey
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<StockTransferDbContext>();
    var usersToMigrate = await db.Users.Where(u => !u.PasswordHash.StartsWith("$2")).ToListAsync();
    if (usersToMigrate.Count > 0)
    {
        foreach (var user in usersToMigrate)
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);
        }

        await db.SaveChangesAsync();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/api/auth/login", async (LoginRequest request, StockTransferDbContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(x => x.Email == request.Email);
    if (user is null) return Results.Unauthorized();

    var isValidPassword = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
    if (!isValidPassword) return Results.Unauthorized();

    var accessToken = CreateAccessToken(user, jwtIssuer, jwtAudience, signingKey);
    var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    var refreshTokenHash = ComputeSha256(refreshToken);
    db.RefreshTokens.Add(new RefreshToken
    {
        Id = Guid.NewGuid(),
        UserId = user.Id,
        TokenHash = refreshTokenHash,
        CreatedAt = DateTime.UtcNow,
        ExpiresAt = DateTime.UtcNow.AddDays(7)
    });
    await db.SaveChangesAsync();

    return Results.Ok(new LoginResponse(accessToken, refreshToken, user.RoleName, user.Id, user.BranchId, user.FullName));
});

app.MapPost("/api/auth/refresh", async (RefreshTokenRequest request, StockTransferDbContext db) =>
{
    var incomingHash = ComputeSha256(request.RefreshToken);
    var existingToken = await db.RefreshTokens
        .OrderByDescending(x => x.CreatedAt)
        .FirstOrDefaultAsync(x => x.TokenHash == incomingHash);

    if (existingToken is null || existingToken.RevokedAt is not null || existingToken.ExpiresAt <= DateTime.UtcNow)
        return Results.Unauthorized();

    var user = await db.Users.FirstOrDefaultAsync(x => x.Id == existingToken.UserId);
    if (user is null) return Results.Unauthorized();

    existingToken.RevokedAt = DateTime.UtcNow;
    var newRefreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    var newRefreshTokenHash = ComputeSha256(newRefreshToken);
    existingToken.ReplacedByTokenHash = newRefreshTokenHash;

    db.RefreshTokens.Add(new RefreshToken
    {
        Id = Guid.NewGuid(),
        UserId = user.Id,
        TokenHash = newRefreshTokenHash,
        CreatedAt = DateTime.UtcNow,
        ExpiresAt = DateTime.UtcNow.AddDays(7)
    });
    await db.SaveChangesAsync();

    var newAccessToken = CreateAccessToken(user, jwtIssuer, jwtAudience, signingKey);
    return Results.Ok(new LoginResponse(newAccessToken, newRefreshToken, user.RoleName, user.Id, user.BranchId, user.FullName));
});

app.MapPost("/api/auth/logout", [Authorize] async (RefreshTokenRequest request, StockTransferDbContext db) =>
{
    var tokenHash = ComputeSha256(request.RefreshToken);
    var existingToken = await db.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == tokenHash);
    if (existingToken is null) return Results.NoContent();

    existingToken.RevokedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/api/auth/change-password", [Authorize] async (
    ChangePasswordRequest request,
    StockTransferDbContext db,
    ClaimsPrincipal principal) =>
{
    var userId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId);
    if (user is null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        return Results.BadRequest("Current and new password are required.");

    if (request.NewPassword.Length < 8)
        return Results.BadRequest("New password must be at least 8 characters.");

    if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        return Results.BadRequest("Current password is incorrect.");

    if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
        return Results.BadRequest("New password must be different from your current password.");

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

    var now = DateTime.UtcNow;
    var existingTokens = await db.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null).ToListAsync();
    foreach (var t in existingTokens)
        t.RevokedAt = now;

    var newRefreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    var newRefreshTokenHash = ComputeSha256(newRefreshToken);
    db.RefreshTokens.Add(new RefreshToken
    {
        Id = Guid.NewGuid(),
        UserId = user.Id,
        TokenHash = newRefreshTokenHash,
        CreatedAt = DateTime.UtcNow,
        ExpiresAt = DateTime.UtcNow.AddDays(7)
    });
    await db.SaveChangesAsync();

    var accessToken = CreateAccessToken(user, jwtIssuer, jwtAudience, signingKey);
    return Results.Ok(new LoginResponse(accessToken, newRefreshToken, user.RoleName, user.Id, user.BranchId, user.FullName));
});

static string CreateAccessToken(AppUser user, string issuer, string audience, SymmetricSecurityKey signingKey)
{
    var claims = new List<Claim>
    {
        new(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new(ClaimTypes.Role, user.RoleName),
        new(ClaimTypes.Name, user.FullName),
        new("branch_id", user.BranchId?.ToString() ?? string.Empty)
    };

    var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        issuer: issuer,
        audience: audience,
        claims: claims,
        expires: DateTime.UtcNow.AddMinutes(30),
        signingCredentials: creds
    );
    return new JwtSecurityTokenHandler().WriteToken(token);
}

static string ComputeSha256(string value)
{
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
    return Convert.ToHexString(bytes);
}

static string EscapeCsv(string value)
{
    if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
    {
        return $"\"{value.Replace("\"", "\"\"")}\"";
    }

    return value;
}

app.MapGet("/api/branches", [Authorize] async (StockTransferDbContext db) =>
{
    var branches = await db.Branches
        .OrderBy(x => x.BranchName)
        .Select(x => new BranchDto(x.Id, x.BranchCode, x.BranchName))
        .ToListAsync();

    return Results.Ok(branches);
});

app.MapGet("/api/products", [Authorize] async (StockTransferDbContext db) =>
{
    var products = await db.Products
        .OrderBy(x => x.ProductName)
        .Select(x => new ProductDto(x.Id, x.ProductCode, x.ProductName))
        .ToListAsync();

    return Results.Ok(products);
});

app.MapGet("/api/products/paged", [Authorize] async (
    StockTransferDbContext db,
    int page = 1,
    int pageSize = 10,
    string? search = null,
    string? sortBy = "productName",
    string? sortDirection = "asc") =>
{
    if (page <= 0) page = 1;
    if (pageSize <= 0) pageSize = 10;
    if (pageSize > 100) pageSize = 100;

    var query = db.Products.AsQueryable();
    if (!string.IsNullOrWhiteSpace(search))
    {
        var searchText = search.Trim();
        query = query.Where(x => x.ProductCode.Contains(searchText) || x.ProductName.Contains(searchText));
    }

    var sortByNormalized = (sortBy ?? "productName").Trim().ToLowerInvariant();
    var sortDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);

    query = (sortByNormalized, sortDesc) switch
    {
        ("productcode", true) => query.OrderByDescending(x => x.ProductCode),
        ("productcode", false) => query.OrderBy(x => x.ProductCode),
        ("productname", true) => query.OrderByDescending(x => x.ProductName),
        _ => query.OrderBy(x => x.ProductName)
    };

    var totalCount = await query.CountAsync();
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(x => new ProductDto(x.Id, x.ProductCode, x.ProductName))
        .ToListAsync();

    return Results.Ok(new PagedResult<ProductDto>(page, pageSize, totalCount, items));
});

app.MapPost("/api/products", [Authorize(Roles = "ADMIN")] async (CreateProductRequest request, StockTransferDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.ProductCode) || string.IsNullOrWhiteSpace(request.ProductName))
    {
        return Results.BadRequest("Product code and product name are required.");
    }

    var normalizedCode = request.ProductCode.Trim();
    var exists = await db.Products.AnyAsync(x => x.ProductCode == normalizedCode);
    if (exists) return Results.BadRequest("Product code already exists.");

    var product = new Product
    {
        ProductCode = normalizedCode,
        ProductName = request.ProductName.Trim()
    };

    db.Products.Add(product);
    await db.SaveChangesAsync();
    return Results.Created($"/api/products/{product.Id}", new ProductDto(product.Id, product.ProductCode, product.ProductName));
});

app.MapPut("/api/products/{id:int}", [Authorize(Roles = "ADMIN")] async (int id, CreateProductRequest request, StockTransferDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.ProductCode) || string.IsNullOrWhiteSpace(request.ProductName))
    {
        return Results.BadRequest("Product code and product name are required.");
    }

    var product = await db.Products.FirstOrDefaultAsync(x => x.Id == id);
    if (product is null) return Results.NotFound();

    var normalizedCode = request.ProductCode.Trim();
    var duplicate = await db.Products.AnyAsync(x => x.Id != id && x.ProductCode == normalizedCode);
    if (duplicate) return Results.BadRequest("Product code already exists.");

    product.ProductCode = normalizedCode;
    product.ProductName = request.ProductName.Trim();
    await db.SaveChangesAsync();
    return Results.Ok(new ProductDto(product.Id, product.ProductCode, product.ProductName));
});

app.MapDelete("/api/products/{id:int}", [Authorize(Roles = "ADMIN")] async (int id, StockTransferDbContext db) =>
{
    var product = await db.Products.FirstOrDefaultAsync(x => x.Id == id);
    if (product is null) return Results.NotFound();

    var usedInTransfers = await db.StockTransferItems.AnyAsync(x => x.ProductCode == product.ProductCode);
    if (usedInTransfers)
    {
        return Results.BadRequest("Cannot delete product because it is already used in transfers.");
    }

    db.Products.Remove(product);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapGet("/api/statuses", [Authorize] async (StockTransferDbContext db) =>
{
    var statuses = await db.StatusMasters
        .Where(x => x.IsActive)
        .OrderBy(x => x.Id)
        .Select(x => new StatusDto(x.Id, x.StatusName))
        .ToListAsync();

    return Results.Ok(statuses);
});

app.MapGet("/api/users", [Authorize(Roles = "ADMIN")] async (StockTransferDbContext db) =>
{
    var userRows = await db.Users
        .AsNoTracking()
        .OrderBy(u => u.FullName)
        .ToListAsync();

    var branchIds = userRows
        .Where(u => u.BranchId.HasValue)
        .Select(u => u.BranchId!.Value)
        .Distinct()
        .ToList();

    var branchNames = await db.Branches
        .AsNoTracking()
        .Where(b => branchIds.Contains(b.Id))
        .ToDictionaryAsync(b => b.Id, b => b.BranchName);

    var users = userRows.Select(u =>
    {
        var branchName = u.BranchId is int bid && branchNames.TryGetValue(bid, out var bn) ? bn : "";
        return new UserDto(u.Id, u.FullName, u.Email, u.RoleName, u.BranchId ?? 0, branchName);
    }).ToList();

    return Results.Ok(users);
});

app.MapPost("/api/users", [Authorize(Roles = "ADMIN")] async (CreateUserRequest request, StockTransferDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.FullName) ||
        string.IsNullOrWhiteSpace(request.Email) ||
        string.IsNullOrWhiteSpace(request.Password) ||
        string.IsNullOrWhiteSpace(request.RoleName))
    {
        return Results.BadRequest("All fields are required.");
    }

    if (request.BranchId <= 0)
    {
        return Results.BadRequest("Branch is required.");
    }

    var branchExists = await db.Branches.AnyAsync(x => x.Id == request.BranchId);
    if (!branchExists) return Results.BadRequest("Invalid branch.");

    var exists = await db.Users.AnyAsync(x => x.Email == request.Email);
    if (exists) return Results.BadRequest("Email already exists.");

    var user = new AppUser
    {
        FullName = request.FullName.Trim(),
        Email = request.Email.Trim(),
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
        RoleName = request.RoleName.Trim(),
        BranchId = request.BranchId
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/api/users/{user.Id}", new { user.Id, user.FullName, user.Email, user.RoleName, user.BranchId });
});

app.MapPut("/api/users/{id:int}", [Authorize(Roles = "ADMIN")] async (
    int id,
    UpdateUserRequest request,
    StockTransferDbContext db,
    ClaimsPrincipal principal) =>
{
    if (string.IsNullOrWhiteSpace(request.FullName) ||
        string.IsNullOrWhiteSpace(request.Email) ||
        string.IsNullOrWhiteSpace(request.RoleName))
    {
        return Results.BadRequest("Full name, email, and role are required.");
    }

    var roleNormalized = request.RoleName.Trim();
    if (!string.Equals(roleNormalized, "ADMIN", StringComparison.OrdinalIgnoreCase) &&
        !string.Equals(roleNormalized, "STORE_MANAGER", StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest("Invalid role.");
    }

    var isManager = string.Equals(roleNormalized, "STORE_MANAGER", StringComparison.OrdinalIgnoreCase);
    if (isManager && request.BranchId <= 0)
        return Results.BadRequest("Branch is required for store managers.");

    if (request.BranchId > 0 && !await db.Branches.AnyAsync(x => x.Id == request.BranchId))
        return Results.BadRequest("Invalid branch.");

    var user = await db.Users.FirstOrDefaultAsync(x => x.Id == id);
    if (user is null) return Results.NotFound();

    var emailTrimmed = request.Email.Trim();
    var duplicate = await db.Users.AnyAsync(x => x.Id != id && x.Email == emailTrimmed);
    if (duplicate) return Results.BadRequest("Email already exists.");

    if (!string.IsNullOrWhiteSpace(request.NewPassword) && request.NewPassword.Length < 8)
        return Results.BadRequest("New password must be at least 8 characters.");

    user.FullName = request.FullName.Trim();
    user.Email = emailTrimmed;
    user.RoleName = roleNormalized.Equals("ADMIN", StringComparison.OrdinalIgnoreCase) ? "ADMIN" : "STORE_MANAGER";
    user.BranchId = isManager ? request.BranchId : (request.BranchId > 0 ? request.BranchId : null);

    if (!string.IsNullOrWhiteSpace(request.NewPassword))
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword.Trim());

    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/users/{id:int}", [Authorize(Roles = "ADMIN")] async (int id, StockTransferDbContext db, ClaimsPrincipal principal) =>
{
    var currentUserId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    if (id == currentUserId)
        return Results.BadRequest("You cannot delete your own account.");

    var user = await db.Users.FirstOrDefaultAsync(x => x.Id == id);
    if (user is null) return Results.NotFound();

    var hasTransfers = await db.StockTransfers.AnyAsync(x => x.CreatedByUserId == id);
    if (hasTransfers)
        return Results.BadRequest("Cannot delete user who created stock transfers.");

    var refreshTokens = await db.RefreshTokens.Where(x => x.UserId == id).ToListAsync();
    db.RefreshTokens.RemoveRange(refreshTokens);
    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/api/transfers", [Authorize(Roles = "STORE_MANAGER")] async (CreateTransferRequest request, StockTransferDbContext db, ClaimsPrincipal principal) =>
{
    var userId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId);
    if (user is null) return Results.Unauthorized();

    var sourceBranchId = request.SourceBranchId;
    if (!await db.Branches.AnyAsync(b => b.Id == sourceBranchId))
        return Results.BadRequest("Invalid source branch.");
    if (!await db.Branches.AnyAsync(b => b.Id == request.DestinationBranchId))
        return Results.BadRequest("Invalid destination branch.");
    if (sourceBranchId == request.DestinationBranchId)
        return Results.BadRequest("Source and destination branch must be different.");

    if (request.Items.Count == 0 || request.Items.Any(i => i.Quantity <= 0))
        return Results.BadRequest("At least one item with quantity > 0 is required.");

    var transfer = new StockTransferHeader
    {
        Id = Guid.NewGuid(),
        TransferNo = $"TRN-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
        SourceBranchId = sourceBranchId,
        DestinationBranchId = request.DestinationBranchId,
        TransferDate = request.TransferDate,
        Status = TransferStatus.Submitted,
        CreatedByUserId = userId,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        Items = request.Items.Select(i => new StockTransferItem
        {
            Id = Guid.NewGuid(),
            ProductCode = i.ProductCode,
            ProductName = i.ProductName,
            Quantity = i.Quantity
        }).ToList()
    };

    db.StockTransfers.Add(transfer);
    await db.SaveChangesAsync();

    return Results.Created($"/api/transfers/{transfer.Id}", new TransferDto(
        transfer.Id,
        transfer.TransferNo,
        transfer.SourceBranchId,
        transfer.DestinationBranchId,
        transfer.TransferDate,
        transfer.Status,
        transfer.CreatedAt,
        transfer.Items.Select(i => new TransferItemDto(i.ProductCode, i.ProductName, i.Quantity)).ToList()
    ));
});

app.MapGet("/api/transfers", [Authorize] async (
    StockTransferDbContext db,
    ClaimsPrincipal principal,
    int page = 1,
    int pageSize = 10,
    string? status = null) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    var userId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var query = db.StockTransfers
        .Include(x => x.Items)
        .AsQueryable();

    if (!string.IsNullOrWhiteSpace(status) &&
        Enum.TryParse<TransferStatus>(status, ignoreCase: true, out var statusFilter))
    {
        query = query.Where(x => x.Status == statusFilter);
    }

    if (role == "STORE_MANAGER")
    {
        query = query.Where(x => x.CreatedByUserId == userId);
    }

    var totalCount = await query.CountAsync();
    var transfers = await query
        .OrderByDescending(x => x.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    var result = transfers.Select(t => new TransferDto(
        t.Id,
        t.TransferNo,
        t.SourceBranchId,
        t.DestinationBranchId,
        t.TransferDate,
        t.Status,
        t.CreatedAt,
        t.Items.Select(i => new TransferItemDto(i.ProductCode, i.ProductName, i.Quantity)).ToList()
    ));

    return Results.Ok(new PagedResult<TransferDto>(page, pageSize, totalCount, result.ToList()));
});

app.MapGet("/api/transfers/{id:guid}/details", [Authorize] async (
    Guid id,
    StockTransferDbContext db,
    ClaimsPrincipal principal) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    var userId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var query = db.StockTransfers.Include(x => x.Items).Where(x => x.Id == id);

    if (role == "STORE_MANAGER")
    {
        query = query.Where(x => x.CreatedByUserId == userId);
    }

    var transfer = await query.FirstOrDefaultAsync();
    if (transfer is null) return Results.NotFound();

    var sourceBranch = await db.Branches.FirstOrDefaultAsync(x => x.Id == transfer.SourceBranchId);
    var destinationBranch = await db.Branches.FirstOrDefaultAsync(x => x.Id == transfer.DestinationBranchId);

    return Results.Ok(new
    {
        transfer.Id,
        transfer.TransferNo,
        TransferDate = transfer.TransferDate.ToString("yyyy-MM-dd"),
        transfer.Status,
        SourceBranchCode = sourceBranch?.BranchCode ?? string.Empty,
        SourceBranchName = sourceBranch?.BranchName ?? string.Empty,
        DestinationBranchCode = destinationBranch?.BranchCode ?? string.Empty,
        DestinationBranchName = destinationBranch?.BranchName ?? string.Empty,
        Items = transfer.Items.Select(i => new
        {
            i.ProductCode,
            i.ProductName,
            i.Quantity
        })
    });
});

app.MapGet("/api/transfers/{id:guid}/export", [Authorize] async (
    Guid id,
    StockTransferDbContext db,
    ClaimsPrincipal principal) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    var userId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var query = db.StockTransfers.Include(x => x.Items).Where(x => x.Id == id);

    if (role == "STORE_MANAGER")
    {
        query = query.Where(x => x.CreatedByUserId == userId);
    }

    var transfer = await query.FirstOrDefaultAsync();
    if (transfer is null) return Results.NotFound();

    var sourceBranch = await db.Branches.FirstOrDefaultAsync(x => x.Id == transfer.SourceBranchId);
    var destinationBranch = await db.Branches.FirstOrDefaultAsync(x => x.Id == transfer.DestinationBranchId);

    var sb = new StringBuilder();
    sb.AppendLine("TransferNo,TransferDate,SourceBranchCode,SourceBranchName,DestinationBranchCode,DestinationBranchName,ProductCode,ProductName,Quantity,Status");
    foreach (var item in transfer.Items)
    {
        sb.AppendLine($"{EscapeCsv(transfer.TransferNo)},{transfer.TransferDate:yyyy-MM-dd},{EscapeCsv(sourceBranch?.BranchCode ?? string.Empty)},{EscapeCsv(sourceBranch?.BranchName ?? string.Empty)},{EscapeCsv(destinationBranch?.BranchCode ?? string.Empty)},{EscapeCsv(destinationBranch?.BranchName ?? string.Empty)},{EscapeCsv(item.ProductCode)},{EscapeCsv(item.ProductName)},{item.Quantity},{EscapeCsv(transfer.Status.ToString())}");
    }

    var bytes = Encoding.UTF8.GetBytes(sb.ToString());
    var fileName = $"transfer-{transfer.TransferNo}.csv";
    return Results.File(bytes, "text/csv", fileName);
});

app.MapPatch("/api/transfers/{id:guid}/status", [Authorize(Roles = "ADMIN")] async (Guid id, string status, StockTransferDbContext db) =>
{
    var transfer = await db.StockTransfers.FirstOrDefaultAsync(t => t.Id == id);
    if (transfer is null) return Results.NotFound();

    var statuses = await db.StatusMasters
        .Where(x => x.IsActive)
        .OrderBy(x => x.Id)
        .Select(x => x.StatusName)
        .ToListAsync();

    if (!statuses.Contains(status))
        return Results.BadRequest("Invalid status.");

    if (!Enum.TryParse<TransferStatus>(status, true, out var parsedStatus))
        return Results.BadRequest("Status not mapped in application.");

    transfer.Status = parsedStatus;
    transfer.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { transfer.Id, transfer.Status });
});

app.Run();
