using Microsoft.AspNetCore.Mvc;
using ProductCatalog.Server.Dtos;
using ProductCatalog.Server.Services;
using System.ComponentModel.DataAnnotations;

namespace ProductCatalog.Server.Controllers;

[ApiController]
[Route("api/products")]
[Produces("application/json")]
public sealed class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ProductDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetAll(CancellationToken cancellationToken)
    {
        var products = await _productService.GetAllAsync(cancellationToken);
        return Ok(products);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var product = await _productService.GetByIdAsync(id, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    /// <summary>
    /// Searches products whose name contains the given text (case-insensitive, partial match).
    /// </summary>
    /// <param name="name">Text to search for, for example "lens".</param>
    /// <param name="cancellationToken">Cancels the search if the client disconnects.</param>
    [HttpGet("search")]
    [ProducesResponseType<IReadOnlyList<ProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> Search(
        [FromQuery, Required, StringLength(100)] string name,
        CancellationToken cancellationToken)
    {
        var products = await _productService.SearchByNameAsync(name, cancellationToken);
        return Ok(products);
    }

    /// <summary>
    /// Returns products whose stock is between <paramref name="min"/> and <paramref name="max"/>, both inclusive.
    /// </summary>
    [HttpGet("stock-level")]
    [ProducesResponseType<IReadOnlyList<ProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetByStockLevel(
        [FromQuery, Required, Range(0, int.MaxValue)] int? min,
        [FromQuery, Required, Range(0, int.MaxValue)] int? max,
        CancellationToken cancellationToken)
    {
        if (min > max)
        {
            ModelState.AddModelError(nameof(min), "min cannot be greater than max.");
            return ValidationProblem(ModelState);
        }

        var products = await _productService.GetByStockLevelAsync(min!.Value, max!.Value, cancellationToken);
        return Ok(products);
    }

    [HttpPost]
    [ProducesResponseType<ProductDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await _productService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    /// <summary>
    /// Adds stock atomically. Safe under concurrent requests.
    /// </summary>
    [HttpPost("{id:int}/add-to-stock/{quantity:int}")]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> AddToStock(
        int id,
        [Range(1, 1_000_000)] int quantity,
        CancellationToken cancellationToken)
    {
        var product = await _productService.AddStockAsync(id, quantity, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    /// <summary>
    /// Removes stock atomically. Returns 409 Conflict if there is not enough stock; the stock is then left unchanged.
    /// </summary>
    [HttpPost("{id:int}/decrement-stock/{quantity:int}")]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductDto>> DecrementStock(
        int id,
        [Range(1, 1_000_000)] int quantity,
        CancellationToken cancellationToken)
    {
        var product = await _productService.DecrementStockAsync(id, quantity, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    /// <summary>
    /// Updates name, description, price and category. Stock is not changed here; use the stock endpoints.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> Update(int id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await _productService.UpdateAsync(id, request, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await _productService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}