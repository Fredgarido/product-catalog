using Microsoft.Data.SqlClient;

namespace ProductCatalog.Server.Tests;

internal static class TestDatabase
{
    private const string LocalDbServer =
        @"Server=(localdb)\MSSQLLocalDB;Trusted_Connection=True;TrustServerCertificate=True";

    public static string CreateConnectionString()
    {
        var server = Environment.GetEnvironmentVariable("TEST_SQL_SERVER");
        if (string.IsNullOrWhiteSpace(server))
        {
            server = LocalDbServer;
        }

        return new SqlConnectionStringBuilder(server)
        {
            InitialCatalog = $"ProductCatalogTests_{Guid.NewGuid():N}"
        }.ConnectionString;
    }
}
