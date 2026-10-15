using AnhDuySport.Api.Data;
using AnhDuySport.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var databaseConfigPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "config", "database.json"));
if (File.Exists(databaseConfigPath))
{
    builder.Configuration.AddJsonFile(databaseConfigPath, optional: false, reloadOnChange: true);
}

var connectionString = builder.Configuration["connectionString"]
    ?? builder.Configuration.GetConnectionString("AnhDuySport")
    ?? throw new InvalidOperationException("Thiếu chuỗi kết nối AnhDuySport.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddScoped<EmailNotificationService>();
builder.Services.AddScoped<UserAccountFlowService>();
builder.Services.AddScoped<MembershipPackageFlowService>();
builder.Services.AddScoped<ManagementDashboardService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.MapControllers();
app.Run();
