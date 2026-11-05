using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Entities;
using ProductCatalog.Server.Exceptions;
using ProductCatalog.Server.Repositories;
using ProductCatalog.Server.Services;

namespace ProductCatalog.Server.Tests;

public sealed class ProductServiceUnitTests
{
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ProductService _service;

    public ProductServiceUnitTests()
    {
        _service = new ProductService(_productRepository, _categoryRepository, NullLogger<ProductService>.Instance);
    }

    [Fact]
    public async Task CreateAsync_TrimsNameAndStoresBlankDescriptionAsNull()
    {
        _categoryRepository.ExistsAsync(1, Arg.Any<CancellationToken>()).Returns(true);
        _productRepository.GetByIdAsync(Arg.Any<int>(), Arg.Any<CancellationToken>()).Returns(MakeProduct());
        var request = new CreateProductRequest
        {
            Name = "  Precision Lens  ",
            Description = "   ",
            Price = 10m,
            StockQuantity = 5,
            CategoryId = 1
        };

        await _service.CreateAsync(request, CancellationToken.None);

        await _productRepository.Received(1).AddAsync(
            Arg.Is<Product>(p => p.Name == "Precision Lens" && p.Description == null),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateAsync_WithUnknownCategory_ThrowsAndSavesNothing()
    {
        _categoryRepository.ExistsAsync(99, Arg.Any<CancellationToken>()).Returns(false);
        var request = new CreateProductRequest { Name = "Lens", Price = 10m, StockQuantity = 1, CategoryId = 99 };

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(request, CancellationToken.None));

        await _productRepository.DidNotReceive().AddAsync(Arg.Any<Product>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateAsync_WithMissingProduct_ReturnsNull()
    {
        _productRepository.GetForUpdateAsync(1, Arg.Any<CancellationToken>()).Returns((Product?)null);

        var result = await _service.UpdateAsync(1, MakeUpdateRequest(categoryId: 1), CancellationToken.None);

        Assert.Null(result);
        await _productRepository.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateAsync_ToUnknownCategory_ThrowsAndSavesNothing()
    {
        _productRepository.GetForUpdateAsync(1, Arg.Any<CancellationToken>()).Returns(MakeProduct(categoryId: 1));
        _categoryRepository.ExistsAsync(2, Arg.Any<CancellationToken>()).Returns(false);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.UpdateAsync(1, MakeUpdateRequest(categoryId: 2), CancellationToken.None));

        await _productRepository.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateAsync_TrimsNameAndKeepsStock()
    {
        var product = MakeProduct(stock: 10, categoryId: 1);
        _productRepository.GetForUpdateAsync(1, Arg.Any<CancellationToken>()).Returns(product);
        _productRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(product);

        await _service.UpdateAsync(1, MakeUpdateRequest(categoryId: 1, name: "  Renamed Lens  "), CancellationToken.None);

        Assert.Equal("Renamed Lens", product.Name);
        Assert.Equal(10, product.StockQuantity);
        await _productRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DeleteAsync_ReturnsWhetherTheProductExisted(bool existed)
    {
        _productRepository.DeleteAsync(1, Arg.Any<CancellationToken>()).Returns(existed);

        var deleted = await _service.DeleteAsync(1, CancellationToken.None);

        Assert.Equal(existed, deleted);
    }

    [Fact]
    public async Task AddStockAsync_WithMissingProduct_ReturnsNull()
    {
        _productRepository.AddStockAsync(1, 5, Arg.Any<DateTime>(), Arg.Any<CancellationToken>()).Returns(false);

        var result = await _service.AddStockAsync(1, 5, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task DecrementStockAsync_WithMissingProduct_ReturnsNull()
    {
        _productRepository.TryDecrementStockAsync(1, 5, Arg.Any<DateTime>(), Arg.Any<CancellationToken>()).Returns(false);
        _productRepository.ExistsAsync(1, Arg.Any<CancellationToken>()).Returns(false);

        var result = await _service.DecrementStockAsync(1, 5, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task DecrementStockAsync_WithInsufficientStock_Throws()
    {
        _productRepository.TryDecrementStockAsync(1, 5, Arg.Any<DateTime>(), Arg.Any<CancellationToken>()).Returns(false);
        _productRepository.ExistsAsync(1, Arg.Any<CancellationToken>()).Returns(true);

        await Assert.ThrowsAsync<InsufficientStockException>(
            () => _service.DecrementStockAsync(1, 5, CancellationToken.None));
    }

    [Fact]
    public async Task SearchByNameAsync_TrimsTheSearchTerm()
    {
        _productRepository.SearchByNameAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(new List<Product>());

        await _service.SearchByNameAsync("  lens  ", CancellationToken.None);

        await _productRepository.Received(1).SearchByNameAsync("lens", Arg.Any<CancellationToken>());
    }

    private static Product MakeProduct(int stock = 10, int categoryId = 1)
    {
        return new Product
        {
            Id = 100001,
            Name = "Precision Lens",
            Price = 10m,
            StockQuantity = stock,
            CategoryId = categoryId,
            Category = new Category { Id = categoryId, Name = "Lenses" }
        };
    }

    private static UpdateProductRequest MakeUpdateRequest(int categoryId, string name = "Precision Lens")
    {
        return new UpdateProductRequest { Name = name, Price = 12m, CategoryId = categoryId };
    }
}
