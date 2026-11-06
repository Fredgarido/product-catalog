namespace ProductCatalog.Server.Exceptions;

public sealed class InsufficientStockException : Exception
{
    public InsufficientStockException(int productId, int requestedQuantity)
        : base($"Product {productId} does not have enough stock to remove {requestedQuantity} unit(s).")
    {
    }
}