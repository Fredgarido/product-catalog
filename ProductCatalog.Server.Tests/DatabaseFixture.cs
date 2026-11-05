using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Data;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Tests;

public sealed class DatabaseFixture : IDisposable
{
    private readonly string _connectionString = TestDatabase.CreateConnectionString();

    public DatabaseFixture()
    {
        using var context = CreateContext();
        context.Database.Migrate();

        var category = new Category { Name = "Test Category" };
        context.Categories.Add(category);
        context.SaveChanges();

        CategoryId = category.Id;
    }

    public int CategoryId { get; }

    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(_connectionString)
            .Options;

        return new AppDbContext(options);
    }

    public void Dispose()
    {
        using var context = CreateContext();
        context.Database.EnsureDeleted();
    }
}