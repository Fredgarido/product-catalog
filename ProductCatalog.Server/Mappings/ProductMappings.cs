using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Mappings;

public static class ProductMappings
{
    public static IQueryable<ProductDto> SelectDto(this IQueryable<Product> query)
    {
        return query.Select(p => new ProductDto(
            p.Id,
            p.Name,
            p.Description,
            p.Price,
            p.StockQuantity,
            p.CategoryId,
            p.Category.Name,
            p.CreatedAt,
            p.UpdatedAt));
    }
}