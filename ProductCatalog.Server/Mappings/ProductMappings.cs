using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Mappings;

public static class ProductMappings
{
    public static ProductDto ToDto(this Product product)
    {
        return new ProductDto(
            product.Id,
            product.Name,
            product.Description,
            product.Price,
            product.StockQuantity,
            product.CategoryId,
            product.Category.Name,
            product.CreatedAt,
            product.UpdatedAt);
    }

    public static IReadOnlyList<ProductDto> ToDtos(this IEnumerable<Product> products)
    {
        return products.Select(ToDto).ToList();
    }
}
