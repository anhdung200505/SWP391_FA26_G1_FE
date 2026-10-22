using QRCoder;

namespace AnhDuySport.Api.Services;

// Ảnh QR vẽ sẵn ở backend để frontend hiện bằng <img> mà không cần cài thêm thư viện vẽ QR.
public static class PayOsQrImage
{
    public static string ToDataUrl(string? qrCode)
    {
        if (string.IsNullOrWhiteSpace(qrCode))
        {
            return "";
        }

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(qrCode, QRCodeGenerator.ECCLevel.M);
        var png = new PngByteQRCode(data).GetGraphic(8);
        return "data:image/png;base64," + Convert.ToBase64String(png);
    }
}
