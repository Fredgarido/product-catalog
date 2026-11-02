using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Data;
using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Entities;
using ProductCatalog.Server.Exceptions;
using ProductCatalog.Server.Mappings;

namespace ProductCatalog.Server.Services;

public sealed class ProductService : IProductService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ProductService> _logger;

    public ProductService(AppDbContext dbContext, ILogger<ProductService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Products
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .SelectDto()
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await _dbContext.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .SelectDto()
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var categoryId = request.CategoryId!.Value;
        await EnsureCategoryExistsAsync(categoryId, cancellationToken);

        var now = DateTime.UtcNow;
        var product = new Product
        {
            Name = request.Name.Trim(),
            Description = NormalizeDescription(request.Description),
            Price = request.Price!.Value,
            StockQuantity = request.StockQuantity!.Value,
            CategoryId = categoryId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Products.Add(product);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created product {ProductId} ({ProductName})", product.Id, product.Name);

        return (await GetByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductDto?> UpdateAsync(int id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await _dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product is null)
        {
            return null;
        }

        var categoryId = request.CategoryId!.Value;
        if (product.CategoryId != categoryId)
        {
            await EnsureCategoryExistsAsync(categoryId, cancellationToken);
        }

        product.Name = request.Name.Trim();
        product.Description = NormalizeDescription(request.Description);
        product.Price = request.Price!.Value;
        product.CategoryId = categoryId;
        product.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated product {ProductId}", id);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var deletedRows = await _dbContext.Products
            .Where(p => p.Id == id)
            .ExecuteDeleteAsync(cancellationToken);

        if (deletedRows > 0)
        {
            _logger.LogInformation("Deleted product {ProductId}", id);
        }

        return deletedRows > 0;
    }

    public async Task<IReadOnlyList<ProductDto>> SearchByNameAsync(string name, CancellationToken cancellationToken)
    {
        var term = name.Trim();

        return await _dbContext.Products
            .AsNoTracking()
            .Where(p => p.Name.Contains(term))
            .OrderBy(p => p.Name)
            .SelectDto()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProductDto>> GetByStockLevelAsync(int min, int max, CancellationToken cancellationToken)
    {
        return await _dbContext.Products
            .AsNoTracking()
            .Where(p => p.StockQuantity >= min && p.StockQuantity <= max)
            .OrderBy(p => p.StockQuantity)
            .ThenBy(p => p.Name)
            .SelectDto()
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductDto?> AddStockAsync(int id, int quantity, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var updatedRows = await _dbContext.Products
            .Where(p => p.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.StockQuantity, p => p.StockQuantity + quantity)
                .SetProperty(p => p.UpdatedAt, now),
                cancellationToken);

        if (updatedRows == 0)
        {
            return null;
        }

        _logger.LogInformation("Added {Quantity} unit(s) to product {ProductId}", quantity, id);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<ProductDto?> DecrementStockAsync(int id, int quantity, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var updatedRows = await _dbContext.Products
            .Where(p => p.Id == id && p.StockQuantity >= quantity)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.StockQuantity, p => p.StockQuantity - quantity)
                .SetProperty(p => p.UpdatedAt, now),
                cancellationToken);

        if (updatedRows == 0)
        {
            var exists = await _dbContext.Products.AnyAsync(p => p.Id == id, cancellationToken);
            if (!exists)
            {
                return null;
            }

            _logger.LogWarning("Insufficient stock to remove {Quantity} unit(s) from product {ProductId}", quantity, id);
            throw new InsufficientStockException(id, quantity);
        }

        _logger.LogInformation("Removed {Quantity} unit(s) from product {ProductId}", quantity, id);

        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task EnsureCategoryExistsAsync(int categoryId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Categories
            .AnyAsync(c => c.Id == categoryId, cancellationToken);

        if (!exists)
        {
            throw new BusinessRuleException($"Category with id {categoryId} does not exist.");
        }
    }

    private static string? NormalizeDescription(string? description)
    {
        return string.IsNullOrWhiteSpace(description) ? null : description.Trim();
    }
}