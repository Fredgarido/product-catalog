using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Repositories;

namespace ProductCatalog.Server.Services;

public sealed class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var categories = await _categoryRepository.GetAllAsync(cancellationToken);
        return categories.Select(c => new CategoryDto(c.Id, c.Name)).ToList();
    }
}
