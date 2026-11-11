using System.Text;
using AnhDuySport.Api;
using AnhDuySport.Api.Data;
using AnhDuySport.Api.Services;
using AnhDuySport.Api.Swagger;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PayOS;

var builder = WebApplication.CreateBuilder(args);

var databaseConfigPath = ResolveConfig(builder, "database.json");
if (File.Exists(databaseConfigPath))
{
    builder.Configuration.AddJsonFile(databaseConfigPath, optional: false, reloadOnChange: true);
}

// Máy dev: config/database.local.json (không commit) trỏ LocalDB, đè lên database.json (Azure).
// Chỉ đọc khi Development nên bản deploy (Production) luôn dùng Azure.
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddJsonFile(ResolveConfig(builder, "database.local.json"), optional: true, reloadOnChange: true);
}

// Khóa payOS dùng chung cả nhóm: đọc ở mọi môi trường (user-secrets chỉ có trên máy đã đặt và chỉ khi Development).
builder.Configuration.AddJsonFile(ResolveConfig(builder, "payos.json"), optional: true, reloadOnChange: true);

// Mật khẩu ứng dụng SMTP nằm ở file local để merge main không xóa tài khoản gửi OTP.
builder.Configuration.AddJsonFile(ResolveConfig(builder, "email.json"), optional: true, reloadOnChange: true);

builder.Configuration.AddJsonFile(ResolveConfig(builder, "google.json"), optional: true, reloadOnChange: true);

// Khóa Gemini nằm ở file local để không bị đẩy lên git.
builder.Configuration.AddJsonFile(ResolveConfig(builder, "ai.json"), optional: true, reloadOnChange: true);

var connectionString = builder.Configuration["connectionString"]
    ?? builder.Configuration.GetConnectionString("AnhDuySport")
    ?? throw new InvalidOperationException("Thiếu chuỗi kết nối AnhDuySport.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<AppLinks>();
builder.Services.AddSingleton<EmailQueue>();
builder.Services.AddScoped<SmtpEmailSender>();
builder.Services.AddHostedService<EmailDeliveryService>();
builder.Services.AddHostedService<PendingRegistrationCleanupService>();

// Mỗi phút đối chiếu đơn gói hội viên với payOS (webhook không tới được máy local).
builder.Services.AddHostedService<MembershipPaymentSyncService>();
builder.Services.AddHostedService<MembershipExpiryNoticeService>();

// Sau 23:59 buổi học nào học viên chưa có điểm danh thì tự ghi vắng.
builder.Services.AddHostedService<AttendanceAutoAbsentService>();

builder.Services.AddScoped<CurrentActor>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<EmailNotificationService>();
builder.Services.AddScoped<UserAccountFlowService>();
builder.Services.AddScoped<MembershipPackageFlowService>();
builder.Services.AddScoped<ManagementDashboardService>();
builder.Services.AddScoped<ClassRegistrationFlowService>();
builder.Services.AddScoped<ClassManagementFlowService>();
builder.Services.AddScoped<RoomManagementFlowService>();
builder.Services.AddScoped<SportCourseManagementFlowService>();
builder.Services.AddScoped<ReceptionFlowService>();
builder.Services.AddScoped<CenterCheckInFlowService>();
builder.Services.AddScoped<PrivateClassFlowService>();
builder.Services.AddScoped<SessionFlowService>();
builder.Services.AddScoped<SessionManagementFlowService>();
builder.Services.AddScoped<NotificationFlowService>();
builder.Services.AddScoped<StaffActivityFlowService>();
builder.Services.AddScoped<PaymentHistoryFlowService>();
builder.Services.AddScoped<MemberMembershipFlowService>();
builder.Services.AddScoped<CustomerServiceFlowService>();
builder.Services.AddScoped<PayOsPaymentService>();

builder.Services.AddHttpClient<GeminiWorkoutClient>(client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
    client.Timeout = TimeSpan.FromSeconds(100);
});

builder.Services.AddScoped<WorkoutRecommendationFlowService>();
builder.Services.AddScoped<CoachClassAccess>();
builder.Services.AddScoped<CoachCourseFlowService>();
builder.Services.AddScoped<CoachCourseAiFlowService>();
builder.Services.AddScoped<CourseMaterialFlowService>();
builder.Services.AddScoped<ClassIntakeFlowService>();

var payOsClientId = builder.Configuration["PayOS:ClientId"];
var payOsApiKey = builder.Configuration["PayOS:ApiKey"];
var payOsChecksumKey = builder.Configuration["PayOS:ChecksumKey"];

if (!string.IsNullOrWhiteSpace(payOsClientId)
    && !string.IsNullOrWhiteSpace(payOsApiKey)
    && !string.IsNullOrWhiteSpace(payOsChecksumKey))
{
    builder.Services.AddSingleton(new PayOSClient(payOsClientId, payOsApiKey, payOsChecksumKey));
}
else
{
    Console.WriteLine($"payOS chưa có khóa (kiểm tra {ResolveConfig(builder, "payos.json")}). API vẫn chạy nhưng không tạo được mã QR.");
}

var jwtKey = builder.Configuration["Auth:JwtKey"]
    ?? throw new InvalidOperationException("Thiếu khóa ký JWT.");

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
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AnhDuy Sport API",
        Version = "v1"
    });

    options.SchemaFilter<DescriptionSchemaFilter>();

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
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
            },
            Array.Empty<string>()
        },
    });
});

// ================================================================
// CORS: localhost, Azure Static Web Apps, và site trên Vercel
// ================================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.SetIsOriginAllowed(origin =>
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                    return false;

                if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) && uri.Port == 5173)
                    return true;

                if (uri.Host.Equals("purple-stone-04f71a000.6.azurestaticapps.net", StringComparison.OrdinalIgnoreCase))
                    return true;

                return uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase)
                    && (uri.Host.Equals("vercel.app", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.EndsWith(".tmp.now", StringComparison.OrdinalIgnoreCase));
            })
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseMiddleware<PublicGateMiddleware>();

app.UseSwagger();

app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "AnhDuy Sport API");
    options.RoutePrefix = "swagger";
});

// Bật CORS trước Authentication và Authorization.
app.UseCors("Frontend");

// Ảnh học viên tải lên (uploads/avatars) phục vụ ở /api/uploads để đi qua proxy /api của frontend.
var uploadsPath = Path.Combine(
    app.Environment.ContentRootPath,
    AvatarStorage.UploadsFolder
);

Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/api/uploads",
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var startup = scope.ServiceProvider;

    await CoachCourseSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await CenterCheckInSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await PrivateClassSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await SessionChangeSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await MembershipNoticeSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await PaymentBonusSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await CourseMaterialSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await RoomSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await CoachAiSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());
    await MembershipPackageSchema.EnsureAsync(startup.GetRequiredService<AppDbContext>());

    await startup.GetRequiredService<AuthService>().EnsureBootstrapAdminPasswordAsync();
}

app.Run();

static string ResolveConfig(WebApplicationBuilder builder, string fileName)
{
    var published = Path.GetFullPath(
        Path.Combine(builder.Environment.ContentRootPath, "config", fileName)
    );

    if (File.Exists(published))
        return published;

    return Path.GetFullPath(
        Path.Combine(builder.Environment.ContentRootPath, "..", "config", fileName)
    );
}