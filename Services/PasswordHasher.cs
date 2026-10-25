using System.Security.Cryptography;

namespace AnhDuySport.Api.Services;

public sealed class PasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSize = 16;
    private const int KeySize = 32;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return $"pbkdf2.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public static void EnsureAcceptable(string password)
    {
        if (password.Length is < 6 or > 100)
        {
            throw new InvalidOperationException("Mật khẩu cần từ 6 đến 100 ký tự.");
        }

        if (!password.Any(character => character is '@' or '#' or '!'))
        {
            throw new InvalidOperationException("Mật khẩu phải có ít nhất một ký tự đặc biệt như @, # hoặc !.");
        }
    }

    public bool Verify(string password, string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored))
        {
            return false;
        }

        var parts = stored.Split('.');
        if (parts.Length != 4 || parts[0] != "pbkdf2" || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
