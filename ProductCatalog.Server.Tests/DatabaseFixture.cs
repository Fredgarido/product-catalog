using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Data;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Tests;

public sealed class DatabaseFixture : IDisposable
{
    private const string LocalDbServer =
        @"Server=(localdb)\MSSQLLocalDB;Trusted_Connection=True;TrustServerCertificate=True";

    private readonly string _connectionString;

    public DatabaseFixture()
    {
        var server = Environment.GetEnvironmentVariable("TEST_SQL_SERVER");
        if (string.IsNullOrWhiteSpace(server))
        {
            server = LocalDbServer;
        }

        _connectionString = new SqlConnectionStringBuilder(server)
        {
            InitialCatalog = $"ProductCatalogTests_{Guid.NewGuid():N}"
        }.ConnectionString;

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