using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OceanForge.BackendEngine;
using OceanForge.BackendEngine.Hubs;
using OceanForge.BackendEngine.Infrastructure;
using OceanForge.BackendEngine.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();

// 🚀 Register High-Performance HeavyLoadManager with dynamic CPU-based worker pool
builder.Services.AddSingleton<IHeavyLoadManager>(sp => new HeavyLoadManager(
    workerCount: null, // auto-calculated based on Environment.ProcessorCount * 4
    queueCapacity: 20000
));
builder.Services.AddHostedService<AccountWorkerService>();

builder.Services.AddSingleton<MySqlDatabaseService>();
builder.Services.AddScoped<AccountRepository>();
builder.Services.AddSingleton<DataQueue>();
builder.Services.AddSingleton<AccountPresenceTracker>();
builder.Services.AddSingleton<ConcurrencyEngine>();
builder.Services.AddHostedService<DataProcessor>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "https://oceanforge-web.pages.dev")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("Frontend");
app.MapControllers();
app.MapHub<DataHub>("/hubs/data");

app.Run();
