using System.Text;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

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
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddScoped<CurrentActor>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<EmailNotificationService>();
builder.Services.AddScoped<UserAccountFlowService>();
builder.Services.AddScoped<MembershipPackageFlowService>();
builder.Services.AddScoped<ManagementDashboardService>();
builder.Services.AddScoped<ClassRegistrationFlowService>();
builder.Services.AddScoped<SlotFlowService>();
builder.Services.AddScoped<MemberMembershipFlowService>();
builder.Services.AddScoped<CustomerServiceFlowService>();

var jwtKey = builder.Configuration["Auth:JwtKey"] ?? throw new InvalidOperationException("Thiếu khóa ký JWT.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Auth:Issuer"],
            ValidAudience = builder.Configuration["Auth:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "AnhDuy Sport API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Dán JWT lấy từ POST /api/auth/login. Học viên chưa có trang đăng nhập.",
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});
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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var auth = scope.ServiceProvider.GetRequiredService<AuthService>();
    await auth.EnsureBootstrapAdminPasswordAsync();
}

app.Run();
