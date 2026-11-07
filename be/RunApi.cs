using System.Diagnostics;

var apiDirectory = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "AnhDuySport.Api"));
var apiProject = Path.Combine(apiDirectory, "AnhDuySport.Api.csproj");
var dotnet = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "dotnet", "dotnet.exe");
if (!File.Exists(dotnet))
{
    dotnet = "dotnet";
}

var api = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = dotnet,
        Arguments = $"run --project \"{apiProject}\" --launch-profile http",
        WorkingDirectory = apiDirectory,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
    },
};
api.StartInfo.Environment["PUBLIC_GATE_PASSWORD"] = "AnhDuy@123";

var tunnel = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = "cmd.exe",
        Arguments = "/c npx --yes localtunnel --port 5080 --subdomain anhduysport",
        WorkingDirectory = apiDirectory,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
    },
};

void Write(string? line)
{
    if (!string.IsNullOrEmpty(line)) Console.WriteLine(line);
}

api.OutputDataReceived += (_, eventArgs) => Write(eventArgs.Data);
api.ErrorDataReceived += (_, eventArgs) => Write(eventArgs.Data);
tunnel.OutputDataReceived += (_, eventArgs) => Write(eventArgs.Data);
tunnel.ErrorDataReceived += (_, eventArgs) => Write(eventArgs.Data);

api.Start();
api.BeginOutputReadLine();
api.BeginErrorReadLine();
tunnel.Start();
tunnel.BeginOutputReadLine();
tunnel.BeginErrorReadLine();

Console.WriteLine("Swagger trên máy: http://localhost:5080/swagger");
Console.WriteLine("Swagger trên web: https://anhduysport.loca.lt/swagger");

Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    Stop(tunnel);
    Stop(api);
};

api.WaitForExit();
Stop(tunnel);
Environment.Exit(api.ExitCode);

static void Stop(Process process)
{
    try
    {
        if (!process.HasExited)
        {
            process.Kill(entireProcessTree: true);
        }
    }
    catch (InvalidOperationException)
    {
    }
}
