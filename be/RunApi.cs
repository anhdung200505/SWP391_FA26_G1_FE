using System.Diagnostics;

var apiDirectory = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "AnhDuySport.Api"));
var apiProject = Path.Combine(apiDirectory, "AnhDuySport.Api.csproj");
var dotnet = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "dotnet", "dotnet.exe");
if (!File.Exists(dotnet))
{
    dotnet = "dotnet";
}

using var process = Process.Start(new ProcessStartInfo
{
    FileName = dotnet,
    Arguments = $"run --project \"{apiProject}\" --launch-profile http",
    WorkingDirectory = apiDirectory,
    UseShellExecute = false,
}) ?? throw new InvalidOperationException("Không chạy được API.");

Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    if (!process.HasExited)
    {
        process.Kill(entireProcessTree: true);
    }
};

process.WaitForExit();
Environment.Exit(process.ExitCode);
