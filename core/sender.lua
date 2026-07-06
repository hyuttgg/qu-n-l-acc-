-- ==========================================================
-- OceanForge Manager — Roblox Lua Client (GUI Edition)
-- Themed deep-sea navy, gold glows, and premium stats panel
-- ==========================================================

-- Configuration
_G.ApiKey = "" -- Optionally paste your API key here (or enter it in the ingame GUI)
_G.ServerUrl = "http://localhost:5000" -- Change to your hosted backend URL if deployed
_G.HeartbeatInterval = 15 -- Heartbeat in seconds

-- Services
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local TweenService = game:GetService("TweenService")
local LocalPlayer = Players.LocalPlayer

-- Determine Current Sea based on Roblox Place ID, Workspace Map Islands, and Player Level
local function getSea()
    local placeId = game.PlaceId
    if placeId == 2753915549 then
        return 1
    elseif placeId == 4442272183 then
        return 2
    elseif placeId == 7449423635 then
        return 3
    end

    -- Fallback 1: Scan Workspace/Map to identify the Sea based on known unique islands
    local map = workspace:FindFirstChild("Map") or workspace
    if map then
        for _, child in ipairs(map:GetChildren()) do
            local name = child.Name:lower()
            if name:find("turtle") or name:find("hydra") or name:find("castle") or name:find("port town") or name:find("great tree") then
                return 3
            elseif name:find("rose") or name:find("green zone") or name:find("graveyard") or name:find("snow mountain") or name:find("hot and cold") then
                return 2
            elseif name:find("jungle") or name:find("pirate") or name:find("desert") or name:find("frozen") or name:find("sky") or name:find("prison") then
                return 1
            end
        end
    end

    -- Fallback 2: Check player level range (rough estimation based on level progression)
    local level = 1
    local dataFolder = LocalPlayer:FindFirstChild("Data")
    if dataFolder and dataFolder:FindFirstChild("Level") then
        level = dataFolder.Level.Value
    end
    
    if level >= 1500 then
        return 3
    elseif level >= 700 then
        return 2
    else
        return 1
    end
end

-- Determine Current Island based on character position
local function getIslandName()
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then
        return "Unknown"
    end
    
    local pos = char.HumanoidRootPart.Position
    local worldOrigin = workspace:FindFirstChild("Map") or workspace
    local closestDistance = math.huge
    local closestIslandName = "Unknown Island"
    
    for _, island in ipairs(worldOrigin:GetChildren()) do
        if island:IsA("Model") or island:IsA("Folder") then
            local center = island:FindFirstChildOfClass("Part")
            if center then
                local dist = (pos - center.Position).Magnitude
                if dist < closestDistance then
                    closestDistance = dist
                    closestIslandName = island.Name
                end
            end
        end
    end
    
    return closestIslandName
end

-- Scan Character Inventory, Backpack, and Equipment details
local function scanInventory()
    local inventory = {
        fruits = {},
        swords = {},
        guns = {},
        styles = {},
        materials = {},
        accessories = {}
    }
    
    local function parseItem(item)
        if item:IsA("Tool") then
            local toolType = item:GetAttribute("Type") or ""
            local name = item.Name
            
            if name:find("Fruit") then
                table.insert(inventory.fruits, name)
            elseif toolType == "Sword" or name:find("Katana") or name:find("Blade") or name:find("Scythe") or name:find("Trident") or name:find("Saber") or name:find("Anchor") then
                table.insert(inventory.swords, name)
            elseif toolType == "Gun" or name:find("Guitar") or name:find("Rifle") or name:find("Revolver") or name:find("Slingshot") or name:find("Bow") then
                table.insert(inventory.guns, name)
            end
        end
    end

    -- Always scan local materials first (most reliable source on client for materials)
    local materialsMap = {}
    local dataFolder = LocalPlayer:FindFirstChild("Data")
    if dataFolder then
        local inventoryFolder = dataFolder:FindFirstChild("Inventory") or dataFolder:FindFirstChild("Materials")
        if inventoryFolder then
            for _, mat in ipairs(inventoryFolder:GetChildren()) do
                if mat:IsA("NumberValue") or mat:IsA("IntValue") then
                    if mat.Value > 0 then
                        materialsMap[mat.Name] = mat.Value
                        table.insert(inventory.materials, {
                            name = mat.Name,
                            quantity = mat.Value
                        })
                    end
                end
            end
        end
    end

    local scannedViaRemote = false
    local ReplicatedStorage = game:GetService("ReplicatedStorage")
    local CommF = ReplicatedStorage:FindFirstChild("Remotes") and ReplicatedStorage.Remotes:FindFirstChild("CommF_")
    
    if CommF then
        -- Try invoking Blox Fruits getInventory remote
        local success, items = pcall(function()
            return CommF:InvokeServer("getInventory")
        end)
        if success and type(items) == "table" then
            scannedViaRemote = true
            for _, item in ipairs(items) do
                if type(item) == "table" and item.Name then
                    local itemType = item.Type or ""
                    if itemType == "Sword" then
                        table.insert(inventory.swords, item.Name)
                    elseif itemType == "Gun" then
                        table.insert(inventory.guns, item.Name)
                    elseif itemType == "Wear" or itemType == "Accessory" then
                        table.insert(inventory.accessories, item.Name)
                    elseif itemType == "Material" then
                        local quantity = item.Count or item.Quantity or item.Value or 1
                        if not materialsMap[item.Name] then
                            materialsMap[item.Name] = quantity
                            table.insert(inventory.materials, {
                                name = item.Name,
                                quantity = quantity
                            })
                        end
                    elseif itemType == "Blox Fruit" or itemType == "Fruit" then
                        table.insert(inventory.fruits, item.Name)
                    end
                end
            end
        end

        -- Try invoking Blox Fruits getInventoryFruits remote for treasure chest storage
        local successFruits, storedFruits = pcall(function()
            return CommF:InvokeServer("getInventoryFruits")
        end)
        if successFruits and type(storedFruits) == "table" then
            for k, v in pairs(storedFruits) do
                if type(v) == "table" then
                    local name = v.Name or v.name or (type(k) == "string" and k)
                    local qty = v.Count or v.Quantity or v.Value or 1
                    if name then
                        table.insert(inventory.fruits, name .. " (x" .. tostring(qty) .. ")")
                    end
                elseif type(v) == "number" and type(k) == "string" then
                    if v > 0 then
                        table.insert(inventory.fruits, k .. " (x" .. tostring(v) .. ")")
                    end
                elseif type(v) == "string" then
                    table.insert(inventory.fruits, v)
                end
            end
        end
    end

    -- Fallback to local scan for swords/guns/accessories/fruits if remote scanning failed or was not available
    if not scannedViaRemote then
        -- Check Backpack
        for _, item in ipairs(LocalPlayer.Backpack:GetChildren()) do
            parseItem(item)
        end
        
        -- Check currently equipped item in Character
        if LocalPlayer.Character then
            for _, item in ipairs(LocalPlayer.Character:GetChildren()) do
                parseItem(item)
            end
        end
    end

    return inventory
end

-- Scan Equipped items
local function getEquippedDetails(inv)
    local details = {
        fruit = "None",
        fruitMastery = 0,
        sword = "None",
        gun = "None",
        fightingStyle = "Combat",
        accessory = "None"
    }
    local bfAccessories = {
        ["Bear Ears"] = true, ["Black Cape"] = true, ["Black Spikey Coat"] = true,
        ["Blue Spikey Coat"] = true, ["Choppa"] = true, ["Cool Shades"] = true,
        ["Dark Coat"] = true, ["Dino Hood"] = true, ["Dojo Belt"] = true,
        ["Feathered Visage"] = true, ["Ghoul Mask"] = true, ["Golden Sunhat"] = true,
        ["Holy Crown"] = true, ["Hunter Cape"] = true, ["Jaw Shield"] = true,
        ["Kitsune Mask"] = true, ["Kitsune Ribbon"] = true, ["Lei"] = true,
        ["Leviathan Crown"] = true, ["Leviathan Shield"] = true, ["Marine Cap"] = true,
        ["Musketeer Hat"] = true, ["Pale Scarf"] = true, ["Pilot Helmet"] = true,
        ["Pink Coat"] = true, ["Pretty Helmet"] = true, ["Red Spikey Coat"] = true,
        ["Shark Tooth Necklace"] = true, ["Swan Glasses"] = true, ["Swordsman Hat"] = true,
        ["T-Rex Skull"] = true, ["Terror Jaw"] = true, ["Tomoe Ring"] = true,
        ["Top Hat"] = true, ["Usoap's Hat"] = true, ["Valkyrie Helm"] = true,
        ["Warrior Helmet"] = true, ["Zebra Cap"] = true, ["Bandanna"] = true
    }

    local function isBFAccessory(name)
        if bfAccessories[name] then return true end
        for k, _ in pairs(bfAccessories) do
            if name:find(k) then return true end
        end
        return false
    end

    local function checkItem(item)
        if item:IsA("Tool") then
            local name = item.Name
            local toolType = item:GetAttribute("Type") or ""
            if name:find("Fruit") then
                details.fruit = name
            elseif toolType == "Sword" or name:find("Katana") or name:find("Blade") or name:find("Scythe") or name:find("Trident") or name:find("Saber") or name:find("Anchor") then
                details.sword = name
            elseif toolType == "Gun" or name:find("Guitar") or name:find("Rifle") or name:find("Revolver") or name:find("Slingshot") or name:find("Bow") then
                details.gun = name
            end
        end
    end

    local function isFightingStyle(item)
        if item:IsA("Tool") then
            local name = item.Name
            local toolType = item:GetAttribute("Type") or ""
            if toolType == "Melee" 
               or name == "Combat" 
               or name == "Dark Step" 
               or name == "Death Step" 
               or name == "Electro" 
               or name == "Electric Claw" 
               or name == "Water Kung Fu" 
               or name == "Sharkman Karate" 
               or name == "Dragon Breath" 
               or name == "Dragon Talon" 
               or name == "Superhuman" 
               or name == "Godhuman" 
               or name == "Sanguine Art" 
               or name:find("Style") then
                return true
            end
        end
        return false
    end

    -- First detect what is actively equipped on the Character
    if LocalPlayer.Character then
        for _, item in ipairs(LocalPlayer.Character:GetChildren()) do
            if item:IsA("Accessory") then
                if isBFAccessory(item.Name) then
                    details.accessory = item.Name
                end
            else
                checkItem(item)
            end
        end
    end

    -- If no sword/gun in hand, look inside Backpack (hotbar loadout)
    if details.sword == "None" then
        for _, item in ipairs(LocalPlayer.Backpack:GetChildren()) do
            if item.Name:find("Katana") or item.Name:find("Blade") or item.Name:find("Scythe") or item.Name:find("Trident") or item.Name:find("Saber") or item.Name:find("Anchor") then
                details.sword = item.Name
                break
            end
        end
    end
    if details.gun == "None" then
        for _, item in ipairs(LocalPlayer.Backpack:GetChildren()) do
            if item.Name:find("Guitar") or item.Name:find("Rifle") or item.Name:find("Revolver") or item.Name:find("Slingshot") or item.Name:find("Bow") then
                details.gun = item.Name
                break
            end
        end
    end

    -- Detect Fighting Style from Character (in hand) or Backpack (hotbar)
    local foundStyle = false
    if LocalPlayer.Character then
        for _, item in ipairs(LocalPlayer.Character:GetChildren()) do
            if isFightingStyle(item) then
                details.fightingStyle = item.Name
                foundStyle = true
                break
            end
        end
    end
    if not foundStyle then
        for _, item in ipairs(LocalPlayer.Backpack:GetChildren()) do
            if isFightingStyle(item) then
                details.fightingStyle = item.Name
                break
            end
        end
    end

    -- If still None, fall back to first scanned item in lists (usually for local scans or basic validation fallback)
    if details.sword == "None" and #inv.swords > 0 then
        details.sword = inv.swords[1]
    end
    if details.gun == "None" and #inv.guns > 0 then
        details.gun = inv.guns[1]
    end

    local stats = LocalPlayer:FindFirstChild("Stats") or LocalPlayer:FindFirstChild("Data")
    if stats then
        local demonFruit = stats:FindFirstChild("DemonFruit") or stats:FindFirstChild("Fruit")
        if demonFruit and demonFruit:FindFirstChild("Mastery") then
            details.fruitMastery = demonFruit.Mastery.Value
        end
        
        local fruitVal = stats:FindFirstChild("DevilFruit") or stats:FindFirstChild("FruitName") or stats:FindFirstChild("Fruit")
        if fruitVal and details.fruit == "None" then
            details.fruit = fruitVal.Value
        end
    end

    return details
end

-- Get character Race
local function getRace()
    local data = LocalPlayer:FindFirstChild("Data")
    if data and data:FindFirstChild("Race") then
        return data.Race.Value
    end
    return "Human"
end

-- GUI Setup variables
local isMinimized = false
local heartbeatLoopActive = false
local pulseTween = nil

-- OceanForge Premium GUI Construction
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "OceanForgeGui"
ScreenGui.ResetOnSpawn = false

-- Use CoreGui if available to resist resets and hiding
local successCore, coreGui = pcall(function() return game:GetService("CoreGui") end)
if successCore and coreGui then
    ScreenGui.Parent = coreGui
else
    ScreenGui.Parent = LocalPlayer:WaitForChild("PlayerGui")
end

-- Main Window Frame (Themed glassmorphism crimson)
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 360, 0, 260)
MainFrame.Position = UDim2.new(0.5, -180, 0.4, -130)
MainFrame.BackgroundColor3 = Color3.fromRGB(20, 10, 12) -- Crimson Charcoal
MainFrame.BackgroundTransparency = 0.15
MainFrame.BorderSizePixel = 0
MainFrame.Active = true
MainFrame.Draggable = true
MainFrame.Parent = ScreenGui

local MainCorner = Instance.new("UICorner")
MainCorner.CornerRadius = UDim.new(0, 12)
MainCorner.Parent = MainFrame

-- Neon Crimson Red Border
local MainStroke = Instance.new("UIStroke")
MainStroke.Thickness = 1.5
MainStroke.Color = Color3.fromRGB(239, 68, 68) -- Neon Red
MainStroke.Parent = MainFrame

-- Topbar
local Topbar = Instance.new("Frame")
Topbar.Name = "Topbar"
Topbar.Size = UDim2.new(1, 0, 0, 45)
Topbar.BackgroundTransparency = 1
Topbar.Parent = MainFrame

local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Size = UDim2.new(0.7, 0, 1, 0)
Title.Position = UDim2.new(0.05, 0, 0, 0)
Title.BackgroundTransparency = 1
Title.Text = "🔥 CRIMSONFORGE ENGINE"
Title.TextColor3 = Color3.fromRGB(239, 68, 68) -- Neon Red
Title.Font = Enum.Font.GothamBold
Title.TextSize = 15
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = Topbar

local TopDivider = Instance.new("Frame")
TopDivider.Size = UDim2.new(0.9, 0, 0, 1)
TopDivider.Position = UDim2.new(0.05, 0, 1, 0)
TopDivider.BackgroundColor3 = Color3.fromRGB(153, 27, 27) -- Crimson Red
TopDivider.BorderSizePixel = 0
TopDivider.Parent = Topbar

-- Minimize Button
local MinBtn = Instance.new("TextButton")
MinBtn.Name = "MinBtn"
MinBtn.Size = UDim2.new(0, 30, 0, 30)
MinBtn.Position = UDim2.new(0.9, -15, 0.5, -15)
MinBtn.BackgroundTransparency = 1
MinBtn.Text = "−"
MinBtn.TextColor3 = Color3.fromRGB(239, 68, 68)
MinBtn.Font = Enum.Font.GothamBold
MinBtn.TextSize = 18
MinBtn.Parent = Topbar

-- Minimized Anchor Button (Floating anchor on corner)
local AnchorBtn = Instance.new("TextButton")
AnchorBtn.Name = "AnchorBtn"
AnchorBtn.Size = UDim2.new(0, 50, 0, 50)
AnchorBtn.Position = UDim2.new(0.95, -50, 0.85, -50)
AnchorBtn.BackgroundColor3 = Color3.fromRGB(20, 10, 12)
AnchorBtn.TextColor3 = Color3.fromRGB(239, 68, 68)
AnchorBtn.Text = "🔥"
AnchorBtn.Font = Enum.Font.GothamBold
AnchorBtn.TextSize = 24
AnchorBtn.Visible = false
AnchorBtn.Parent = ScreenGui

local AnchorCorner = Instance.new("UICorner")
AnchorCorner.CornerRadius = UDim.new(0, 25)
AnchorCorner.Parent = AnchorBtn

local AnchorStroke = Instance.new("UIStroke")
AnchorStroke.Thickness = 1.5
AnchorStroke.Color = Color3.fromRGB(239, 68, 68)
AnchorStroke.Parent = AnchorBtn

-- 1. Key Ingest Screen (Visible when Key not authenticated)
local IngestScreen = Instance.new("Frame")
IngestScreen.Name = "IngestScreen"
IngestScreen.Size = UDim2.new(1, 0, 0.8, 0)
IngestScreen.Position = UDim2.new(0, 0, 0.2, 0)
IngestScreen.BackgroundTransparency = 1
IngestScreen.Parent = MainFrame

local IngestDesc = Instance.new("TextLabel")
IngestDesc.Size = UDim2.new(0.9, 0, 0.25, 0)
IngestDesc.Position = UDim2.new(0.05, 0, 0.08, 0)
IngestDesc.BackgroundTransparency = 1
IngestDesc.Text = "Enter your CrimsonForge API key to connect this bot instance to your web dashboard."
IngestDesc.TextColor3 = Color3.fromRGB(244, 197, 205) -- Light Slate Rose
IngestDesc.Font = Enum.Font.GothamSemibold
IngestDesc.TextSize = 12
IngestDesc.TextWrapped = true
IngestDesc.Parent = IngestScreen

local KeyBox = Instance.new("TextBox")
KeyBox.Name = "KeyBox"
KeyBox.Size = UDim2.new(0.9, 0, 0.22, 0)
KeyBox.Position = UDim2.new(0.05, 0, 0.38, 0)
KeyBox.BackgroundColor3 = Color3.fromRGB(12, 6, 8) -- Deep Dark Charcoal Red
KeyBox.TextColor3 = Color3.fromRGB(255, 255, 255)
KeyBox.PlaceholderText = "Paste api key here..."
KeyBox.PlaceholderColor3 = Color3.fromRGB(153, 27, 27) -- Crimson Red
KeyBox.ClearTextOnFocus = false
KeyBox.Font = Enum.Font.Code
KeyBox.TextSize = 11
KeyBox.Text = _G.ApiKey
KeyBox.Parent = IngestScreen

local KeyCorner = Instance.new("UICorner")
KeyCorner.CornerRadius = UDim.new(0, 8)
KeyCorner.Parent = KeyBox

local KeyStroke = Instance.new("UIStroke")
KeyStroke.Thickness = 1
KeyStroke.Color = Color3.fromRGB(220, 38, 38) -- Neon Red
KeyStroke.Parent = KeyBox

local ConnectBtn = Instance.new("TextButton")
ConnectBtn.Name = "ConnectBtn"
ConnectBtn.Size = UDim2.new(0.9, 0, 0.22, 0)
ConnectBtn.Position = UDim2.new(0.05, 0, 0.68, 0)
ConnectBtn.BackgroundColor3 = Color3.fromRGB(220, 38, 38) -- Neon Red
ConnectBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
ConnectBtn.Text = "CONNECT FLEET"
ConnectBtn.Font = Enum.Font.GothamBold
ConnectBtn.TextSize = 12
ConnectBtn.Parent = IngestScreen

local ConnectCorner = Instance.new("UICorner")
ConnectCorner.CornerRadius = UDim.new(0, 8)
ConnectCorner.Parent = ConnectBtn

-- 2. Connected Monitor Screen (Visible when Key authenticated)
local MonitorScreen = Instance.new("Frame")
MonitorScreen.Name = "MonitorScreen"
MonitorScreen.Size = UDim2.new(1, 0, 0.8, 0)
MonitorScreen.Position = UDim2.new(0, 0, 0.2, 0)
MonitorScreen.BackgroundTransparency = 1
MonitorScreen.Visible = false
MonitorScreen.Parent = MainFrame

-- Led pulsating dot indicators
local LedIndicator = Instance.new("Frame")
LedIndicator.Name = "LedIndicator"
LedIndicator.Size = UDim2.new(0, 8, 0, 8)
LedIndicator.Position = UDim2.new(0.05, 0, 0.08, 0)
LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68) -- Glowing red
LedIndicator.BorderSizePixel = 0
LedIndicator.Parent = MonitorScreen

local LedCorner = Instance.new("UICorner")
LedCorner.CornerRadius = UDim.new(0, 4)
LedCorner.Parent = LedIndicator

local LedLabel = Instance.new("TextLabel")
LedLabel.Size = UDim2.new(0.8, 0, 0, 15)
LedLabel.Position = UDim2.new(0.09, 0, 0.05, 0)
LedLabel.BackgroundTransparency = 1
LedLabel.Text = "STATUS: SYNCING REALTIME"
LedLabel.TextColor3 = Color3.fromRGB(239, 68, 68) -- Neon Red
LedLabel.Font = Enum.Font.GothamBold
LedLabel.TextSize = 11
LedLabel.TextXAlignment = Enum.TextXAlignment.Left
LedLabel.Parent = MonitorScreen

-- Account details breakdown (Crimson styles)
local StatsFrame = Instance.new("Frame")
StatsFrame.Size = UDim2.new(0.9, 0, 0.52, 0)
StatsFrame.Position = UDim2.new(0.05, 0, 0.22, 0)
StatsFrame.BackgroundTransparency = 1
StatsFrame.Parent = MonitorScreen

local UsernameLabel = Instance.new("TextLabel")
UsernameLabel.Size = UDim2.new(1, 0, 0.25, 0)
UsernameLabel.BackgroundTransparency = 1
UsernameLabel.Text = "Account: " .. LocalPlayer.Name
UsernameLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
UsernameLabel.Font = Enum.Font.GothamSemibold
UsernameLabel.TextSize = 12
UsernameLabel.TextXAlignment = Enum.TextXAlignment.Left
UsernameLabel.Parent = StatsFrame

local LevelLabel = Instance.new("TextLabel")
LevelLabel.Size = UDim2.new(1, 0, 0.25, 0)
LevelLabel.Position = UDim2.new(0, 0, 0.25, 0)
LevelLabel.BackgroundTransparency = 1
LevelLabel.Text = "Level: -- / 2550"
LevelLabel.TextColor3 = Color3.fromRGB(244, 63, 94) -- Rose Red
LevelLabel.Font = Enum.Font.GothamSemibold
LevelLabel.TextSize = 12
LevelLabel.TextXAlignment = Enum.TextXAlignment.Left
LevelLabel.Parent = StatsFrame

local BeliLabel = Instance.new("TextLabel")
BeliLabel.Size = UDim2.new(1, 0, 0.25, 0)
BeliLabel.Position = UDim2.new(0, 0, 0.5, 0)
BeliLabel.BackgroundTransparency = 1
BeliLabel.Text = "Beli: $0"
BeliLabel.TextColor3 = Color3.fromRGB(239, 68, 68) -- Neon Red
BeliLabel.Font = Enum.Font.GothamSemibold
BeliLabel.TextSize = 12
BeliLabel.TextXAlignment = Enum.TextXAlignment.Left
BeliLabel.Parent = StatsFrame

local IslandLabel = Instance.new("TextLabel")
IslandLabel.Size = UDim2.new(1, 0, 0.25, 0)
IslandLabel.Position = UDim2.new(0, 0, 0.75, 0)
IslandLabel.BackgroundTransparency = 1
IslandLabel.Text = "Island: Scanning..."
IslandLabel.TextColor3 = Color3.fromRGB(244, 197, 205) -- Light Slate Rose
IslandLabel.Font = Enum.Font.GothamSemibold
IslandLabel.TextSize = 12
IslandLabel.TextXAlignment = Enum.TextXAlignment.Left
IslandLabel.Parent = StatsFrame

local DisconnectBtn = Instance.new("TextButton")
DisconnectBtn.Name = "DisconnectBtn"
DisconnectBtn.Size = UDim2.new(0.9, 0, 0.18, 0)
DisconnectBtn.Position = UDim2.new(0.05, 0, 0.78, 0)
DisconnectBtn.BackgroundColor3 = Color3.fromRGB(20, 10, 12)
DisconnectBtn.TextColor3 = Color3.fromRGB(239, 68, 68) -- Neon Red
DisconnectBtn.Text = "DISCONNECT ENGINE"
DisconnectBtn.Font = Enum.Font.GothamBold
DisconnectBtn.TextSize = 10
DisconnectBtn.Parent = MonitorScreen

local DisconnectCorner = Instance.new("UICorner")
DisconnectCorner.CornerRadius = UDim.new(0, 8)
DisconnectCorner.Parent = DisconnectBtn

local DisconnectStroke = Instance.new("UIStroke")
DisconnectStroke.Thickness = 1
DisconnectStroke.Color = Color3.fromRGB(239, 68, 68)
DisconnectStroke.Parent = DisconnectBtn

-- Helper to format Beli/Fragments numbers with commas
local function formatComma(amount)
    local formatted = tostring(amount)
    while true do  
        formatted, k = string.gsub(formatted, "^(-?%d+)(%d%d%d)", '%1,%2')
        if (k==0) then
            break
        end
    end
    return formatted
end

-- Main Ingestion Sync Function
local function sendStats()
    local dataFolder = LocalPlayer:FindFirstChild("Data")
    if not dataFolder then
        warn("OceanForge: Player Data folder not found. Retrying in next heartbeat.")
        return
    end

    local level = dataFolder:FindFirstChild("Level") and dataFolder.Level.Value or 1
    local beli = dataFolder:FindFirstChild("Beli") and dataFolder.Beli.Value or 0
    local fragments = dataFolder:FindFirstChild("Fragments") and dataFolder.Fragments.Value or 0
    
    local inventory = scanInventory()
    local equipped = getEquippedDetails(inventory)
    
    -- Update UI stats labels
    LevelLabel.Text = "Level: " .. formatComma(level) .. " / 2550"
    BeliLabel.Text = "Beli: $" .. formatComma(beli) .. "  |  Fragments: " .. formatComma(fragments)
    IslandLabel.Text = "Island: " .. getIslandName() .. " (Sea " .. getSea() .. ")"
    
    -- Determine farming status
    local status = "idle"
    local humanoid = LocalPlayer.Character and LocalPlayer.Character:FindFirstChild("Humanoid")
    if humanoid and humanoid.MoveDirection.Magnitude > 0 then
        status = "grinding"
    end
    
    local targetFolder = workspace:FindFirstChild("Enemies")
    if targetFolder then
        for _, enemy in ipairs(targetFolder:GetChildren()) do
            if enemy:FindFirstChild("Humanoid") and enemy.Humanoid.Health > 0 then
                local dist = (LocalPlayer.Character.HumanoidRootPart.Position - enemy.HumanoidRootPart.Position).Magnitude
                if dist < 150 then
                    if enemy:GetAttribute("IsBoss") or enemy.Name:find("Boss") or enemy.Humanoid.MaxHealth > 500000 then
                        status = "bossing"
                    else
                        status = "grinding"
                    end
                    break
                end
            end
        end
    end

    -- Construct payload
    local payload = {
        username = LocalPlayer.Name,
        level = level,
        beli = beli,
        fragments = fragments,
        race = getRace(),
        sea = getSea(),
        fruit_equipped = equipped.fruit,
        fruit_mastery = equipped.fruitMastery,
        sword = equipped.sword,
        gun = equipped.gun,
        fighting_style = equipped.fightingStyle,
        accessory_equipped = equipped.accessory or "None",
        status = status,
        location = getIslandName(),
        playtime = math.floor(workspace.DistributedGameTime),
        inventory = inventory
    }

    local success, jsonPayload = pcall(function()
        return HttpService:JSONEncode(payload)
    end)

    if not success then
        warn("OceanForge: Failed to serialize data payload.")
        return
    end

    local requestLib = (syn and syn.request) or (http and http.request) or request or http_request
    if not requestLib then
        warn("OceanForge: HTTP request executor function not found! Make sure your executor supports HTTP requests.")
        return
    end

    task.spawn(function()
        -- Pulse heartbeat led color on start
        LedIndicator.BackgroundColor3 = Color3.fromRGB(249, 115, 22) -- Orange during request
        
        local response = requestLib({
            Url = _G.ServerUrl .. "/api/lua/update",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-api-key"] = _G.ApiKey
            },
            Body = jsonPayload
        })

        if response and response.StatusCode == 200 then
            LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68) -- Neon Red success
            print("OceanForge: Synchronized stats successfully.")
        else
            LedIndicator.BackgroundColor3 = Color3.fromRGB(127, 29, 29) -- Dim Red failure
            warn("OceanForge: Synchronization failed. Status code: " .. tostring(response and response.StatusCode or "unknown"))
        end
    end)
end

-- Setup Heartbeat schedule loop
local function startHeartbeatScheduler()
    if heartbeatLoopActive then return end
    heartbeatLoopActive = true
    
    -- Led indicator heartbeat scale animation
    task.spawn(function()
        while heartbeatLoopActive do
            local info = TweenInfo.new(0.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, 0, true)
            local ledTween = TweenService:Create(LedIndicator, info, {Size = UDim2.new(0, 12, 0, 12), Position = UDim2.new(0.045, 0, 0.07, 0)})
            ledTween:Play()
            task.wait(2.5)
        end
    end)

    task.spawn(function()
        while heartbeatLoopActive do
            pcall(sendStats)
            task.wait(_G.HeartbeatInterval)
        end
    end)
end

local function stopHeartbeatScheduler()
    heartbeatLoopActive = false
    LedIndicator.BackgroundColor3 = Color3.fromRGB(127, 29, 29) -- Dim Red stopped
end

-- Toggle Connection handler
local function connectEngine(key)
    if not key or key == "" then
        warn("OceanForge: API Key field is empty.")
        return
    end
    
    _G.ApiKey = key
    IngestScreen.Visible = false
    MonitorScreen.Visible = true
    startHeartbeatScheduler()
end

local function disconnectEngine()
    _G.ApiKey = ""
    stopHeartbeatScheduler()
    MonitorScreen.Visible = false
    IngestScreen.Visible = true
end

-- Button click listeners
ConnectBtn.MouseButton1Click:Connect(function()
    connectEngine(KeyBox.Text)
end)

DisconnectBtn.MouseButton1Click:Connect(function()
    disconnectEngine()
end)

-- Minimize / Restore animations
local function toggleMinimize()
    isMinimized = not isMinimized
    if isMinimized then
        MainFrame.Visible = false
        AnchorBtn.Visible = true
    else
        AnchorBtn.Visible = false
        MainFrame.Visible = true
    end
end

MinBtn.MouseButton1Click:Connect(toggleMinimize)
AnchorBtn.MouseButton1Click:Connect(toggleMinimize)

-- Connect Hover Button Tweens
local function addHoverTween(button, hoverBgColor, originalBgColor)
    button.MouseEnter:Connect(function()
        TweenService:Create(button, TweenInfo.new(0.2), {BackgroundColor3 = hoverBgColor}):Play()
    end)
    button.MouseLeave:Connect(function()
        TweenService:Create(button, TweenInfo.new(0.2), {BackgroundColor3 = originalBgColor}):Play()
    end)
end

addHoverTween(ConnectBtn, Color3.fromRGB(243, 229, 171), Color3.fromRGB(212, 175, 55))
addHoverTween(DisconnectBtn, Color3.fromRGB(239, 68, 68), Color3.fromRGB(2, 6, 23))

-- Custom smooth dragging controller
local function makeDraggable(frame)
    local dragToggle = nil
    local dragSpeed = 0.08
    local dragInput = nil
    local dragStart = nil
    local startPosition = nil

    local function updateInput(input)
        local delta = input.Position - dragStart
        local position = UDim2.new(
            startPosition.X.Scale,
            startPosition.X.Offset + delta.X,
            startPosition.Y.Scale,
            startPosition.Y.Offset + delta.Y
        )
        TweenService:Create(frame, TweenInfo.new(dragSpeed, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {Position = position}):Play()
    end

    frame.InputBegan:Connect(function(input)
        if (input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch) then
            dragToggle = true
            dragStart = input.Position
            startPosition = frame.Position
            
            input.Changed:Connect(function()
                if input.UserInputState == Enum.UserInputState.End then
                    dragToggle = false
                end
            end)
        end
    end)

    frame.InputChanged:Connect(function(input)
        if (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
            dragInput = input
        end
    end)

    game:GetService("UserInputService").InputChanged:Connect(function(input)
        if input == dragInput and dragToggle then
            updateInput(input)
        end
    end)
end

-- Make both windows draggable
makeDraggable(MainFrame)
makeDraggable(AnchorBtn)

-- Check if global key is already provided at start
if _G.ApiKey and _G.ApiKey ~= "" and _G.ApiKey ~= "YOUR_API_KEY_HERE" then
    connectEngine(_G.ApiKey)
else
    IngestScreen.Visible = true
end
