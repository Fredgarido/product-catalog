using ProductCatalog.Server.Dtos;

namespace ProductCatalog.Server.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken cancellationToken);
}