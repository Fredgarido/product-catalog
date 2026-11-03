using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Entities;
using ProductCatalog.Server.Exceptions;
using ProductCatalog.Server.Mappings;
using ProductCatalog.Server.Repositories;

namespace ProductCatalog.Server.Services;

public sealed class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        IProductRepository productRepository,
        ICategoryRepository categoryRepository,
        ILogger<ProductService> logger)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var products = await _productRepository.GetAllAsync(cancellationToken);
        return products.ToDtos();
    }

    public async Task<ProductDto?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var product = await _productRepository.GetByIdAsync(id, cancellationToken);
        return product?.ToDto();
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

        await _productRepository.AddAsync(product, cancellationToken);

        _logger.LogInformation("Created product {ProductId} ({ProductName})", product.Id, product.Name);

        return (await GetByIdAsync(product.Id, cancellationToken))!;
    }

    public async Task<ProductDto?> UpdateAsync(int id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await _productRepository.GetForUpdateAsync(id, cancellationToken);

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

        await _productRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated product {ProductId}", id);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var deleted = await _productRepository.DeleteAsync(id, cancellationToken);

        if (deleted)
        {
            _logger.LogInformation("Deleted product {ProductId}", id);
        }

        return deleted;
    }

    public async Task<IReadOnlyList<ProductDto>> SearchByNameAsync(string name, CancellationToken cancellationToken)
    {
        var products = await _productRepository.SearchByNameAsync(name.Trim(), cancellationToken);
        return products.ToDtos();
    }

    public async Task<IReadOnlyList<ProductDto>> GetByStockLevelAsync(int min, int max, CancellationToken cancellationToken)
    {
        var products = await _productRepository.GetByStockLevelAsync(min, max, cancellationToken);
        return products.ToDtos();
    }

    public async Task<ProductDto?> AddStockAsync(int id, int quantity, CancellationToken cancellationToken)
    {
        var added = await _productRepository.AddStockAsync(id, quantity, DateTime.UtcNow, cancellationToken);

        if (!added)
        {
            return null;
        }

        _logger.LogInformation("Added {Quantity} unit(s) to product {ProductId}", quantity, id);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<ProductDto?> DecrementStockAsync(int id, int quantity, CancellationToken cancellationToken)
    {
        var decremented = await _productRepository.TryDecrementStockAsync(id, quantity, DateTime.UtcNow, cancellationToken);

        if (!decremented)
        {
            if (!await _productRepository.ExistsAsync(id, cancellationToken))
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
        if (!await _categoryRepository.ExistsAsync(categoryId, cancellationToken))
        {
            throw new BusinessRuleException($"Category with id {categoryId} does not exist.");
        }
    }

    private static string? NormalizeDescription(string? description)
    {
        return string.IsNullOrWhiteSpace(description) ? null : description.Trim();
    }
}
