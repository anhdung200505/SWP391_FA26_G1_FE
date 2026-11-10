namespace AnhDuySport.Api.Services;

// Đường dẫn trang học viên gắn vào Gmail. App:PublicUrl là https://anhduysport.vercel.app.
public class AppLinks(IConfiguration configuration)
{
    public string MemberSchedule() => Url("/hoc-vien-dashboard?tab=schedule");

    public string MemberOverview() => Url("/hoc-vien-dashboard?tab=overview");

    public string MembershipRenew() => Url("/dang-ky-khoa-hoc?mode=renew");

    private string Url(string path)
    {
        var root = configuration["App:PublicUrl"];
        if (string.IsNullOrWhiteSpace(root))
        {
            root = "http://localhost:5173";
        }

        return root.TrimEnd('/') + path;
    }
}
