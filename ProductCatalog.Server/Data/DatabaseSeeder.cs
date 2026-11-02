using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Entities;

namespace ProductCatalog.Server.Data;

public static class DatabaseSeeder
{
    public static void Seed(DbContext context)
    {
        if (context.Set<Category>().Any())
        {
            return;
        }

        context.Set<Category>().AddRange(CreateSampleData());
        context.SaveChanges();
    }

    public static async Task SeedAsync(DbContext context, CancellationToken cancellationToken)
    {
        if (await context.Set<Category>().AnyAsync(cancellationToken))
        {
            return;
        }

        context.Set<Category>().AddRange(CreateSampleData());
        await context.SaveChangesAsync(cancellationToken);
    }

    private static List<Category> CreateSampleData()
    {
        var now = DateTime.UtcNow;

        return new List<Category>
        {
            new Category
            {
                Name = "Microscopes",
                Products = new List<Product>
                {
                    new Product { Name = "Compound Microscope CM-100", Description = "Upright microscope for routine lab work.", Price = 2499.00m, StockQuantity = 12, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "Stereo Microscope SM-300", Description = "3D viewing for inspection and dissection.", Price = 3899.00m, StockQuantity = 5, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "Digital Microscope DM-50", Description = "Compact microscope with built-in camera.", Price = 1299.99m, StockQuantity = 0, CreatedAt = now, UpdatedAt = now }
                }
            },
            new Category
            {
                Name = "Lenses",
                Products = new List<Product>
                {
                    new Product { Name = "Standard Objective Lens 10x", Description = "General-purpose objective lens.", Price = 349.00m, StockQuantity = 40, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "Oil Immersion Objective Lens 100x", Description = "High-magnification lens for oil immersion.", Price = 1150.00m, StockQuantity = 7, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "Wide-Field Eyepiece 10x", Description = "Eyepiece with a wide field of view.", Price = 189.50m, StockQuantity = 60, CreatedAt = now, UpdatedAt = now }
                }
            },
            new Category
            {
                Name = "Measuring Instruments",
                Products = new List<Product>
                {
                    new Product { Name = "Digital Caliper 150mm", Description = "Stainless steel caliper with LCD display.", Price = 89.90m, StockQuantity = 120, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "Coordinate Measuring Probe CP-2", Description = "Touch probe for coordinate measuring machines.", Price = 4750.00m, StockQuantity = 3, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "Laser Distance Meter LD-40", Description = "Measures distances up to 40 metres.", Price = 219.00m, StockQuantity = 25, CreatedAt = now, UpdatedAt = now }
                }
            },
            new Category
            {
                Name = "Accessories",
                Products = new List<Product>
                {
                    new Product { Name = "Microscope Slide Set (50 pcs)", Description = null, Price = 24.99m, StockQuantity = 300, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "Lens Cleaning Kit", Description = "Brushes, tissues and cleaning fluid.", Price = 19.95m, StockQuantity = 85, CreatedAt = now, UpdatedAt = now },
                    new Product { Name = "LED Ring Light RL-60", Description = "Even illumination for microscopes.", Price = 159.00m, StockQuantity = 15, CreatedAt = now, UpdatedAt = now }
                }
            }
        };
    }
}