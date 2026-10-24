namespace AnhDuySport.Api.Services;

// Lưu ảnh đại diện vào thư mục uploads/avatars của API. Program.cs phục vụ thư mục uploads ở /api/uploads
// để frontend gọi qua proxy /api của Vite mà không cần cấu hình thêm.
public static class AvatarStorage
{
    public const string UploadsFolder = "uploads";
    public const string PublicPrefix = "/api/uploads/avatars/";
    public const long MaxBytes = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> Extensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
    };

    public static string Folder(string contentRoot) => Path.Combine(contentRoot, UploadsFolder, "avatars");

    // Trả đường dẫn công khai của ảnh vừa lưu.
    public static async Task<string> SaveAsync(string contentRoot, int userId, IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            throw new InvalidOperationException("Chọn một ảnh để tải lên.");
        }

        if (file.Length > MaxBytes)
        {
            throw new InvalidOperationException("Ảnh đại diện tối đa 2 MB.");
        }

        if (!Extensions.TryGetValue(file.ContentType ?? "", out var extension))
        {
            throw new InvalidOperationException("Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF.");
        }

        // Kiểm tra vài byte đầu để file đổi đuôi không giả làm ảnh được.
        var header = new byte[12];
        await using (var probe = file.OpenReadStream())
        {
            _ = await probe.ReadAsync(header);
        }

        if (!LooksLikeImage(header, extension))
        {
            throw new InvalidOperationException("File không phải ảnh hợp lệ.");
        }

        var folder = Folder(contentRoot);
        Directory.CreateDirectory(folder);
        var fileName = $"{userId}-{Guid.NewGuid():N}{extension}";
        await using (var target = File.Create(Path.Combine(folder, fileName)))
        {
            await file.CopyToAsync(target);
        }

        return PublicPrefix + fileName;
    }

    // Xóa ảnh cũ do hệ thống lưu (không đụng ảnh có sẵn như assets/coachs/...).
    public static void DeleteIfUploaded(string contentRoot, string? avatarUrl)
    {
        if (avatarUrl is null || !avatarUrl.StartsWith(PublicPrefix, StringComparison.Ordinal))
        {
            return;
        }

        var path = Path.Combine(Folder(contentRoot), Path.GetFileName(avatarUrl));
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    private static bool LooksLikeImage(byte[] header, string extension) => extension switch
    {
        ".jpg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
        ".png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
        ".gif" => header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38,
        ".webp" => header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
            && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
        _ => false,
    };
}
