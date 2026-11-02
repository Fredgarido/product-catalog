using Microsoft.Extensions.Logging.Abstractions;
using ProductCatalog.Server.Data;
using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Exceptions;
using ProductCatalog.Server.Services;

namespace ProductCatalog.Server.Tests;

public sealed class ProductServiceTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public ProductServiceTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateAsync_AssignsSixDigitId()
    {
        var product = await CreateProductAsync();

        Assert.InRange(product.Id, 100000, 999999);
    }

    [Fact]
    public async Task CreateAsync_WithUnknownCategory_ThrowsBusinessRuleException()
    {
        await using var context = _fixture.CreateContext();
        var service = CreateService(context);
        var request = new CreateProductRequest
        {
            Name = "Ghost Product",
            Price = 10m,
            StockQuantity = 1,
            CategoryId = 999999
        };

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => service.CreateAsync(request, CancellationToken.None));
    }

    [Fact]
    public async Task DecrementStockAsync_WithEnoughStock_ReducesStock()
    {
        var product = await CreateProductAsync(stock: 10);
        await using var context = _fixture.CreateContext();

        var result = await CreateService(context).DecrementStockAsync(product.Id, 3, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(7, result.StockQuantity);
    }

    [Fact]
    public async Task DecrementStockAsync_WithInsufficientStock_ThrowsAndLeavesStockUnchanged()
    {
        var product = await CreateProductAsync(stock: 5);
        await using var context = _fixture.CreateContext();
        var service = CreateService(context);

        await Assert.ThrowsAsync<InsufficientStockException>(
            () => service.DecrementStockAsync(product.Id, 6, CancellationToken.None));

        var unchanged = await service.GetByIdAsync(product.Id, CancellationToken.None);
        Assert.Equal(5, unchanged!.StockQuantity);
    }

    [Fact]
    public async Task DecrementStockAsync_WithUnknownProduct_ReturnsNull()
    {
        await using var context = _fixture.CreateContext();

        var result = await CreateService(context).DecrementStockAsync(999999, 1, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task AddStockAsync_IncreasesStock()
    {
        var product = await CreateProductAsync(stock: 10);
        await using var context = _fixture.CreateContext();

        var result = await CreateService(context).AddStockAsync(product.Id, 5, CancellationToken.None);

        Assert.Equal(15, result!.StockQuantity);
    }

    [Fact]
    public async Task UpdateAsync_DoesNotChangeStock()
    {
        var product = await CreateProductAsync(stock: 10);
        await using var context = _fixture.CreateContext();
        var request = new UpdateProductRequest
        {
            Name = "Renamed Product",
            Price = 20m,
            CategoryId = _fixture.CategoryId
        };

        var result = await CreateService(context).UpdateAsync(product.Id, request, CancellationToken.None);

        Assert.Equal("Renamed Product", result!.Name);
        Assert.Equal(10, result.StockQuantity);
    }

    [Fact]
    public async Task SearchByNameAsync_IsCaseInsensitiveAndMatchesPartially()
    {
        var uniqueWord = $"Zoom{Guid.NewGuid():N}"[..12];
        var product = await CreateProductAsync(name: $"Super {uniqueWord} Lens");
        await using var context = _fixture.CreateContext();

        var results = await CreateService(context).SearchByNameAsync(uniqueWord.ToUpperInvariant(), CancellationToken.None);

        Assert.Contains(results, p => p.Id == product.Id);
    }

    [Fact]
    public async Task GetByStockLevelAsync_IncludesBothBoundaries()
    {
        var atMin = await CreateProductAsync(stock: 200);
        var atMax = await CreateProductAsync(stock: 210);
        var outside = await CreateProductAsync(stock: 211);
        await using var context = _fixture.CreateContext();

        var results = await CreateService(context).GetByStockLevelAsync(200, 210, CancellationToken.None);

        Assert.Contains(results, p => p.Id == atMin.Id);
        Assert.Contains(results, p => p.Id == atMax.Id);
        Assert.DoesNotContain(results, p => p.Id == outside.Id);
    }

    [Fact]
    public async Task DecrementStockAsync_ConcurrentRequests_NeverOversell()
    {
        var product = await CreateProductAsync(stock: 10);

        var attempts = Enumerable.Range(0, 20).Select(async _ =>
        {
            await using var context = _fixture.CreateContext();
            try
            {
                await CreateService(context).DecrementStockAsync(product.Id, 1, CancellationToken.None);
                return true;
            }
            catch (InsufficientStockException)
            {
                return false;
            }
        });

        var results = await Task.WhenAll(attempts);

        Assert.Equal(10, results.Count(succeeded => succeeded));

        await using var verifyContext = _fixture.CreateContext();
        var final = await CreateService(verifyContext).GetByIdAsync(product.Id, CancellationToken.None);
        Assert.Equal(0, final!.StockQuantity);
    }

    private static ProductService CreateService(AppDbContext context)
    {
        return new ProductService(context, NullLogger<ProductService>.Instance);
    }

    private async Task<ProductDto> CreateProductAsync(int stock = 10, string name = "Test Product")
    {
        await using var context = _fixture.CreateContext();
        var request = new CreateProductRequest
        {
            Name = name,
            Price = 9.99m,
            StockQuantity = stock,
            CategoryId = _fixture.CategoryId
        };

        return await CreateService(context).CreateAsync(request, CancellationToken.None);
    }
}