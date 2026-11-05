using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Data;

namespace ProductCatalog.Server.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString = TestDatabase.CreateConnectionString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(_connectionString)
                .Options;

            using var context = new AppDbContext(options);
            context.Database.EnsureDeleted();
        }

        base.Dispose(disposing);
    }
}
