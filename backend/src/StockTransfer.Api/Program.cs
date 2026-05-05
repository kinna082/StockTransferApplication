using StockTransfer.Application;
using StockTransfer.Domain;
using Microsoft.EntityFrameworkCore;
using StockTransfer.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
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

app.MapGet("/api/branches", [Authorize] async (StockTransferDbContext db) =>
{
    var branches = await db.Branches
        .OrderBy(x => x.BranchName)
        .Select(x => new BranchDto(x.Id, x.BranchCode, x.BranchName))
        .ToListAsync();

    return Results.Ok(branches);
});

app.MapPost("/api/transfers", [Authorize(Roles = "STORE_MANAGER")] async (CreateTransferRequest request, StockTransferDbContext db, ClaimsPrincipal principal) =>
{
    if (request.SourceBranchId == request.DestinationBranchId)
        return Results.BadRequest("Source and destination branch must be different.");

    if (request.Items.Count == 0 || request.Items.Any(i => i.Quantity <= 0))
        return Results.BadRequest("At least one item with quantity > 0 is required.");

    var transfer = new StockTransferHeader
    {
        Id = Guid.NewGuid(),
        TransferNo = $"TRN-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
        SourceBranchId = request.SourceBranchId,
        DestinationBranchId = request.DestinationBranchId,
        TransferDate = request.TransferDate,
        Status = TransferStatus.Submitted,
        CreatedByUserId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!),
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

    if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TransferStatus>(status, true, out var parsedStatus))
    {
        query = query.Where(x => x.Status == parsedStatus);
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

app.MapPatch("/api/transfers/{id:guid}/status", [Authorize(Roles = "ADMIN")] async (Guid id, TransferStatus status, StockTransferDbContext db) =>
{
    var transfer = await db.StockTransfers.FirstOrDefaultAsync(t => t.Id == id);
    if (transfer is null) return Results.NotFound();

    var validTransition =
        (transfer.Status == TransferStatus.Submitted && status == TransferStatus.Inprogress) ||
        (transfer.Status == TransferStatus.Inprogress && status == TransferStatus.Completed) ||
        (transfer.Status == status);

    if (!validTransition)
        return Results.BadRequest("Invalid status transition.");

    transfer.Status = status;
    transfer.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { transfer.Id, transfer.Status });
});

app.Run();
