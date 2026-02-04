FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# copy csproj files (for caching)
COPY ["ProcessorService/ProcessorService.csproj", "ProcessorService/"]
COPY ["Common/Common.csproj", "Common/"]

RUN dotnet restore "ProcessorService/ProcessorService.csproj"

# copy everything else
COPY . .

RUN dotnet build "ProcessorService/ProcessorService.csproj" \
  -c $BUILD_CONFIGURATION \
  -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "ProcessorService/ProcessorService.csproj" \
  -c $BUILD_CONFIGURATION \
  -o /app/publish \
  /p:UseAppHost=false

FROM base AS final
WORKDIR /app

# create non-root user
RUN adduser -u 1001 -D appuser
USER appuser

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ProcessorService.dll"]
