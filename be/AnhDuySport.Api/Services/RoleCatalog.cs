namespace AnhDuySport.Api.Services;

public static class RoleCatalog
{
    public const int ActorUserId = 1;
    public const string AdminCode = "ADMIN";

    public static string StatusLabel(string status) => status switch
    {
        "active" => "Đang hoạt động",
        "locked" => "Đã khóa",
        _ => "Ngưng hoạt động",
    };
}
