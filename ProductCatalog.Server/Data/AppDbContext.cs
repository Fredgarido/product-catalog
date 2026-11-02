using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Data;

public class AppDbContext : DbContext
{
    public const string ProductIdSequence = "ProductIdSequence";

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();

    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 100000–999999 keeps every ID a true 6-digit integer (no zero-padding needed).
        // The sequence lives in the database, so IDs stay unique across multiple API instances.
        modelBuilder.HasSequence<int>(ProductIdSequence)
            .StartsAt(100000)
            .IncrementsBy(1)
            .HasMin(100000)
            .HasMax(999999);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}