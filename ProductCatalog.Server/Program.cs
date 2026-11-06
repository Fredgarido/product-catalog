using Microsoft.EntityFrameworkCore;
using ProductCatalog.Server.Data;
using ProductCatalog.Server.ErrorHandling;
using ProductCatalog.Server.Repositories;
using ProductCatalog.Server.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
        .UseSeeding((context, _) => DatabaseSeeder.Seed(context))
        .UseAsyncSeeding((context, _, cancellationToken) => DatabaseSeeder.SeedAsync(context, cancellationToken)));

builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

var app = builder.Build();

var applyMigrations = app.Environment.IsDevelopment()
    || app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup");

if (applyMigrations)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseDefaultFiles();
app.MapStaticAssets();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
