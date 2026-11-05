namespace AnhDuySport.Api.Services;

// Đường dẫn trang học viên gắn vào Gmail. Mặc định máy local; đổi App:PublicUrl khi có tên miền.
public class AppLinks(IConfiguration configuration)
{
    public string MemberSchedule() => Url("/hoc-vien-dashboard#schedule");

    public string MemberOverview() => Url("/hoc-vien-dashboard#overview");

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
