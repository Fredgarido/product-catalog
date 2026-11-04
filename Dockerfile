ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS frontend
WORKDIR /src
COPY productcatalog.client/package.json productcatalog.client/package-lock.json ./
RUN npm ci
COPY productcatalog.client/ ./
RUN npx ng build --configuration production

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY ProductCatalog.Server/ProductCatalog.Server.csproj ProductCatalog.Server/
RUN dotnet restore ProductCatalog.Server/ProductCatalog.Server.csproj
COPY ProductCatalog.Server/ ProductCatalog.Server/
COPY --from=frontend /src/dist/productcatalog.client/browser/ ProductCatalog.Server/wwwroot/
RUN dotnet publish ProductCatalog.Server/ProductCatalog.Server.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "ProductCatalog.Server.dll"]
