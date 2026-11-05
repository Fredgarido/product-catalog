using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using ProductCatalog.Server.Dtos;

namespace ProductCatalog.Server.Tests;

public sealed class ProductsApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public ProductsApiTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("""{ "price": 10, "stockQuantity": 1, "categoryId": 1 }""", "Name")]
    [InlineData("""{ "name": "   ", "price": 10, "stockQuantity": 1, "categoryId": 1 }""", "Name")]
    [InlineData("""{ "name": "Lens", "price": 0, "stockQuantity": 1, "categoryId": 1 }""", "Price")]
    [InlineData("""{ "name": "Lens", "price": 10, "stockQuantity": -1, "categoryId": 1 }""", "StockQuantity")]
    [InlineData("""{ "name": "Lens", "price": 10, "stockQuantity": 1 }""", "CategoryId")]
    public async Task Create_WithInvalidField_Returns400ForThatField(string body, string field)
    {
        var response = await _client.PostAsync("/api/products", Json(body));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(field, await ErrorFieldsAsync(response), StringComparer.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("/api/products/search")]
    [InlineData("/api/products/stock-level?min=10&max=5")]
    public async Task Get_WithInvalidQuery_Returns400(string url)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DecrementStock_WithZeroQuantity_Returns400()
    {
        var product = await CreateProductAsync(stock: 5);

        var response = await _client.PostAsync($"/api/products/{product.Id}/decrement-stock/0", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithUnknownCategory_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/products",
            new { name = "Ghost Lens", price = 10m, stockQuantity = 1, categoryId = 999999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Invalid request", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Create_WithValidProduct_Returns201WithLocation()
    {
        var categoryId = await GetCategoryIdAsync();

        var response = await _client.PostAsJsonAsync("/api/products",
            new { name = "Api Lens", price = 25.5m, stockQuantity = 4, categoryId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(response.Headers.Location);
        Assert.EndsWith($"/api/products/{created!.Id}", response.Headers.Location.ToString());

        var fetched = await _client.GetAsync(response.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, fetched.StatusCode);
    }

    [Theory]
    [InlineData("GET", "/api/products/999999")]
    [InlineData("DELETE", "/api/products/999999")]
    [InlineData("POST", "/api/products/999999/decrement-stock/1")]
    public async Task MissingProduct_Returns404(string method, string url)
    {
        var response = await _client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ExistingProduct_Returns204AndRemovesIt()
    {
        var product = await CreateProductAsync();

        var response = await _client.DeleteAsync($"/api/products/{product.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var fetched = await _client.GetAsync($"/api/products/{product.Id}");
        Assert.Equal(HttpStatusCode.NotFound, fetched.StatusCode);
    }

    [Fact]
    public async Task DecrementStock_WithInsufficientStock_Returns409AndKeepsStock()
    {
        var product = await CreateProductAsync(stock: 2);

        var response = await _client.PostAsync($"/api/products/{product.Id}/decrement-stock/3", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Insufficient stock", problem.GetProperty("title").GetString());

        var unchanged = await _client.GetFromJsonAsync<ProductDto>($"/api/products/{product.Id}");
        Assert.Equal(2, unchanged!.StockQuantity);
    }

    private static StringContent Json(string body)
    {
        return new StringContent(body, Encoding.UTF8, "application/json");
    }

    private static async Task<IReadOnlyList<string>> ErrorFieldsAsync(HttpResponseMessage response)
    {
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        return problem.GetProperty("errors").EnumerateObject().Select(error => error.Name).ToList();
    }

    private async Task<int> GetCategoryIdAsync()
    {
        var categories = await _client.GetFromJsonAsync<List<CategoryDto>>("/api/categories");
        return categories![0].Id;
    }

    private async Task<ProductDto> CreateProductAsync(int stock = 10)
    {
        var categoryId = await GetCategoryIdAsync();
        var response = await _client.PostAsJsonAsync("/api/products",
            new { name = "Api Test Product", price = 10m, stockQuantity = stock, categoryId });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ProductDto>())!;
    }
}
