using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Repositories;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken cancellationToken);

    Task<Product?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<Product?> GetForUpdateAsync(int id, CancellationToken cancellationToken);

    Task<IReadOnlyList<Product>> SearchByNameAsync(string term, CancellationToken cancellationToken);

    Task<IReadOnlyList<Product>> GetByStockLevelAsync(int min, int max, CancellationToken cancellationToken);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken);

    Task AddAsync(Product product, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);

    Task<bool> AddStockAsync(int id, int quantity, DateTime updatedAt, CancellationToken cancellationToken);

    Task<bool> TryDecrementStockAsync(int id, int quantity, DateTime updatedAt, CancellationToken cancellationToken);
}
