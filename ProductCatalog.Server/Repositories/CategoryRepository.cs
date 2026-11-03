using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Data;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Repositories;

public sealed class CategoryRepository : ICategoryRepository
{
    private readonly AppDbContext _dbContext;

    public CategoryRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(int id, CancellationToken cancellationToken)
    {
        return await _dbContext.Categories
            .AnyAsync(c => c.Id == id, cancellationToken);
    }
}
