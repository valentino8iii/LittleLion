# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY src/LittleLion.Domain/LittleLion.Domain.csproj LittleLion.Domain/
COPY src/LittleLion.Application/LittleLion.Application.csproj LittleLion.Application/
COPY src/LittleLion.Infrastructure/LittleLion.Infrastructure.csproj LittleLion.Infrastructure/
COPY src/LittleLion.Api/LittleLion.Api.csproj LittleLion.Api/

RUN dotnet restore LittleLion.Api/LittleLion.Api.csproj

# Copy source code and build
COPY src/LittleLion.Domain/ LittleLion.Domain/
COPY src/LittleLion.Application/ LittleLion.Application/
COPY src/LittleLion.Infrastructure/ LittleLion.Infrastructure/
COPY src/LittleLion.Api/ LittleLion.Api/

RUN dotnet publish LittleLion.Api/LittleLion.Api.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser

# Copy published app
COPY --from=build /app/publish .

# Change ownership and switch to non-root user
RUN chown -R appuser:appuser /app
USER appuser

# Expose port (Render.com uses PORT env variable)
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080

# Start the application (uses PORT env var via shell expansion)
CMD ["sh", "-c", "dotnet LittleLion.Api.dll --urls http://+:${PORT}"]
