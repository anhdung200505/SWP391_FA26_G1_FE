FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY config/ config/
COPY AnhDuySport.Api/ AnhDuySport.Api/
WORKDIR /src/AnhDuySport.Api
RUN dotnet publish AnhDuySport.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "AnhDuySport.Api.dll"]
