using System.Security.Cryptography;
using System.Text;

namespace AnhDuySport.Api;

// Chặn người lạ khi API được mở ra internet. Localhost không hỏi mật khẩu.
public sealed class PublicGateMiddleware
{
    public const string CookieName = "anhduy_gate";
    private readonly RequestDelegate _next;
    private readonly string _password;
    private readonly byte[] _key;

    public PublicGateMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _password = Environment.GetEnvironmentVariable("PUBLIC_GATE_PASSWORD")
            ?? configuration["PublicGate:Password"]
            ?? "";
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(configuration["Auth:JwtKey"] ?? "anhduy-gate"));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (_password.Length == 0 || IsLocal(context.Request.Host.Host) || context.Request.Path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        if (HttpMethods.IsPost(context.Request.Method)
            && context.Request.Path.Equals("/cong-vao", StringComparison.OrdinalIgnoreCase))
        {
            var form = await context.Request.ReadFormAsync();
            if (Matches(form["password"].ToString(), _password))
            {
                context.Response.Cookies.Append(CookieName, Sign("ok"), new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Lax,
                    MaxAge = TimeSpan.FromHours(12),
                    Path = "/",
                });
                var back = form["return"].ToString();
                if (back.Length == 0 || !back.StartsWith('/') || back.StartsWith("//")) back = "/swagger";
                context.Response.Redirect(back);
                return;
            }

            await WriteForm(context, "Mật khẩu không đúng.");
            return;
        }

        if (Valid(context))
        {
            await _next(context);
            return;
        }

        await WriteForm(context, null);
    }

    private bool Valid(HttpContext context)
    {
        if (!context.Request.Cookies.TryGetValue(CookieName, out var value) || string.IsNullOrEmpty(value))
            return false;
        var expected = Sign("ok");
        if (value.Length != expected.Length) return false;
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(value),
            Encoding.UTF8.GetBytes(expected));
    }

    private string Sign(string value)
    {
        var hash = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash);
    }

    private static bool Matches(string given, string expected)
    {
        var a = SHA256.HashData(Encoding.UTF8.GetBytes(given));
        var b = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static bool IsLocal(string host) =>
        host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || host.Equals("::1", StringComparison.OrdinalIgnoreCase);

    private static async Task WriteForm(HttpContext context, string? error)
    {
        var back = context.Request.Path.Value ?? "/swagger";
        if (!back.StartsWith('/') || back.StartsWith("//") || back.Equals("/cong-vao", StringComparison.OrdinalIgnoreCase))
            back = "/swagger";
        back = System.Net.WebUtility.HtmlEncode(back);
        var message = string.IsNullOrEmpty(error)
            ? ""
            : $"<p style=\"color:#b91c1c;font-weight:700\">{error}</p>";
        var html = $$"""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>AnhDuy Sport</title>
            </head>
            <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0f17;font-family:Segoe UI,sans-serif">
              <form method="post" action="/cong-vao" style="width:min(360px,92vw);background:#181d2a;color:#fff;padding:28px;border-radius:16px">
                <h1 style="margin:0 0 8px;font-size:22px">AnhDuy Sport</h1>
                <p style="margin:0 0 16px;color:#9ca3af;font-size:14px">Nhập mật khẩu để vào Swagger.</p>
                {{message}}
                <input type="hidden" name="return" value="{{back}}" />
                <input name="password" type="password" autofocus required style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #374151;background:#0d0f17;color:#fff" />
                <button type="submit" style="margin-top:14px;width:100%;padding:12px;border:0;border-radius:10px;background:#e31b23;color:#fff;font-weight:800;cursor:pointer">Vào</button>
              </form>
            </body>
            </html>
            """;
        context.Response.StatusCode = StatusCodes.Status200OK;
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.WriteAsync(html);
    }
}
