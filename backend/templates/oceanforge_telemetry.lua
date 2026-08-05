-- ===================================================================
-- ✨ OCEANFORGE ROBLOX LUA AUTOMATED TELEMETRY SCRIPT (MULTI-USER SAAS)
-- Copy & Paste this script into your Roblox Executor (Fluxus/Synapse/Delta/Wave/Xeno)
-- ===================================================================

-- Environment Isolation & Executor Cross-Compatibility Helper
local getgenv = getgenv or function() return _G end
local env = getgenv()

-- 🔑 API KEY & SERVER CONFIGURATION WITH DISCORD BOT & GLOBAL FALLBACKS
local API_KEY = env.OceanForgeApiKey or _G.OceanForgeApiKey or "PASTE_YOUR_API_KEY_HERE"
local SERVER_URL = (env.OceanForgeServerUrl or _G.OceanForgeServerUrl or "http://localhost:5000") .. "/api/webhook/roblox"

-- Local key persistence (saves Discord API key locally so executor reloads seamlessly)
local HttpService = game:GetService("HttpService")
if isfile and readfile and (API_KEY == "" or API_KEY == "PASTE_YOUR_API_KEY_HERE") then
    if isfile("oceanforge_key.json") then
        pcall(function()
            local data = HttpService:JSONDecode(readfile("oceanforge_key.json"))
            if data and data.key then API_KEY = data.key end
        end)
    end
end

if writefile and API_KEY ~= "" and API_KEY ~= "PASTE_YOUR_API_KEY_HERE" then
    pcall(function()
        writefile("oceanforge_key.json", HttpService:JSONEncode({ key = API_KEY }))
    end)
end
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local function getSea()
    local placeId = game.PlaceId
    if placeId == 2753915549 then return 1 end
    if placeId == 4442272183 then return 2 end
    if placeId == 7449423635 then return 3 end
    return 1
end

local function getEquippedItem(category)
    local char = LocalPlayer.Character
    if not char then return "None" end
    for _, tool in ipairs(char:GetChildren()) do
        if tool:IsA("Tool") and tool:FindFirstChild("ToolTip") and tool.ToolTip == category then
            return tool.Name
        end
    end
    return "None"
end

local function sendTelemetry()
    pcall(function()
        local dataFolder = LocalPlayer:FindFirstChild("Data")
        local level = dataFolder and dataFolder:FindFirstChild("Level") and dataFolder.Level.Value or 1
        local beli = dataFolder and dataFolder:FindFirstChild("Beli") and dataFolder.Beli.Value or 0
        local fragments = dataFolder and dataFolder:FindFirstChild("Fragments") and dataFolder.Fragments.Value or 0

        local payload = {
            apiKey = API_KEY,
            robloxUsername = LocalPlayer.Name,
            level = level,
            beli = beli,
            fragments = fragments,
            sea = getSea(),
            race = LocalPlayer:FindFirstChild("Data") and LocalPlayer.Data:FindFirstChild("Race") and LocalPlayer.Data.Race.Value or "Human",
            fruit = getEquippedItem("Blox Fruit"),
            sword = getEquippedItem("Sword"),
            gun = getEquippedItem("Gun"),
            fightingStyle = getEquippedItem("Melee"),
            device = "Roblox Windows Client",
            status = "online"
        }

        local req = (syn and syn.request) or (http and http.request) or request or http_request
        if req then
            req({
                Url = SERVER_URL,
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json",
                    ["x-api-key"] = API_KEY
                },
                Body = HttpService:JSONEncode(payload)
            })
            print("[OceanForge] Realtime Telemetry Synced for " .. LocalPlayer.Name)
        else
            warn("[OceanForge] Executor does not support HTTP requests!")
        end
    end)
end

-- Send initial telemetry
sendTelemetry()

-- Auto-sync every 30 seconds
task.spawn(function()
    while task.wait(30) do
        sendTelemetry()
    end
end)
