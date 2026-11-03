using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Data;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Repositories;

public sealed class ProductRepository : IProductRepository
{
    private readonly AppDbContext _dbContext;

    public ProductRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await ReadQuery()
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Product?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        return await ReadQuery()
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<Product?> GetForUpdateAsync(int id, CancellationToken cancellationToken)
    {
        return await _dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Product>> SearchByNameAsync(string term, CancellationToken cancellationToken)
    {
        return await ReadQuery()
            .Where(p => p.Name.Contains(term))
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Product>> GetByStockLevelAsync(int min, int max, CancellationToken cancellationToken)
    {
        return await ReadQuery()
            .Where(p => p.StockQuantity >= min && p.StockQuantity <= max)
            .OrderBy(p => p.StockQuantity)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(int id, CancellationToken cancellationToken)
    {
        return await _dbContext.Products
            .AnyAsync(p => p.Id == id, cancellationToken);
    }

    public async Task AddAsync(Product product, CancellationToken cancellationToken)
    {
        _dbContext.Products.Add(product);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var deletedRows = await _dbContext.Products
            .Where(p => p.Id == id)
            .ExecuteDeleteAsync(cancellationToken);

        return deletedRows > 0;
    }

    public async Task<bool> AddStockAsync(int id, int quantity, DateTime updatedAt, CancellationToken cancellationToken)
    {
        var updatedRows = await _dbContext.Products
            .Where(p => p.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.StockQuantity, p => p.StockQuantity + quantity)
                .SetProperty(p => p.UpdatedAt, updatedAt),
                cancellationToken);

        return updatedRows > 0;
    }

    public async Task<bool> TryDecrementStockAsync(int id, int quantity, DateTime updatedAt, CancellationToken cancellationToken)
    {
        var updatedRows = await _dbContext.Products
            .Where(p => p.Id == id && p.StockQuantity >= quantity)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(p => p.StockQuantity, p => p.StockQuantity - quantity)
                .SetProperty(p => p.UpdatedAt, updatedAt),
                cancellationToken);

        return updatedRows > 0;
    }

    private IQueryable<Product> ReadQuery()
    {
        return _dbContext.Products
            .AsNoTracking()
            .Include(p => p.Category);
    }
}
