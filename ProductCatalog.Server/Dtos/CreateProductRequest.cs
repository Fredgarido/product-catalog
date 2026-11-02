using System.ComponentModel.DataAnnotations;

namespace ProductCatalog.Server.Dtos;

public sealed record CreateProductRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; init; }

    [Required]
    [Range(0.01, 5_000_000)]
    public decimal? Price { get; init; }

    [Required]
    [Range(0, 1_000_000)]
    public int? StockQuantity { get; init; }

    [Required]
    [Range(1, int.MaxValue)]
    public int? CategoryId { get; init; }
}