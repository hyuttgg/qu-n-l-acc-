-- ==========================================================
-- OceanForge Manager — Roblox Lua Client (GUI Edition)
-- Themed deep-sea navy, gold glows, and premium stats panel
-- ==========================================================

-- Caching standard library functions for maximum performance
local ipairs, pairs, type, tostring = ipairs, pairs, type, tostring
local string_find, string_gsub = string.find, string.gsub
local table_insert = table.insert
local math_huge = math.huge
local pcall, warn, print = pcall, warn, print
local tick, os_date = tick, os.date

-- Configuration
_G.OceanForgeApiKey = "" -- Optionally paste your API key here
_G.OceanForgeServerUrl = "https://api.manageblox.io.vn" -- Change to your hosted backend URL if deployed
_G.OceanForgeHeartbeatInterval = 15 -- Heartbeat in seconds

-- Services
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local TweenService = game:GetService("TweenService")
local LocalPlayer = Players.LocalPlayer
while not LocalPlayer do
    task.wait(0.1)
    LocalPlayer = Players.LocalPlayer
end

-- Cleanup previous execution to prevent thread and GUI leakage
if _G.OceanForgeCleanup then
    pcall(_G.OceanForgeCleanup)
end

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
    local map = workspace:FindFirstChild("Map")
    if map then
        for _, child in ipairs(map:GetChildren()) do
            local name = child.Name:lower()
            -- Sea 3 specific islands
            if string_find(name, "floating turtle", 1, true) or string_find(name, "hydra island", 1, true) or string_find(name, "castle on the sea", 1, true) or string_find(name, "haunted castle", 1, true) or string_find(name, "port town", 1, true) or string_find(name, "great tree", 1, true) then
                return 3
            -- Sea 2 specific islands
            elseif string_find(name, "kingdom of rose", 1, true) or string_find(name, "green zone", 1, true) or string_find(name, "graveyard", 1, true) or string_find(name, "snow mountain", 1, true) or string_find(name, "hot and cold", 1, true) or string_find(name, "ice castle", 1, true) or string_find(name, "cursed ship", 1, true) or string_find(name, "forgotten island", 1, true) then
                return 2
            -- Sea 1 specific islands
            elseif string_find(name, "jungle", 1, true) or string_find(name, "pirate village", 1, true) or string_find(name, "desert", 1, true) or string_find(name, "frozen village", 1, true) or string_find(name, "marine fortress", 1, true) or string_find(name, "middle town", 1, true) or string_find(name, "skypiea", 1, true) or string_find(name, "prison", 1, true) or string_find(name, "magma village", 1, true) or string_find(name, "underwater city", 1, true) or string_find(name, "fountain city", 1, true) then
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
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    if not hrp then
        return "Unknown"
    end
    
    local pos = hrp.Position
    local worldOrigin = workspace:FindFirstChild("Map") or workspace
    local closestDistance = math_huge
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

-- Fighting style lookup table for O(1) performance
local FIGHTING_STYLES = {
    ["Combat"] = true, ["Dark Step"] = true, ["Death Step"] = true,
    ["Electric"] = true, ["Electro"] = true, ["Electric Claw"] = true, ["Water Kung Fu"] = true,
    ["Sharkman Karate"] = true, ["Dragon Breath"] = true, ["Dragon Talon"] = true,
    ["Superhuman"] = true, ["Godhuman"] = true, ["Sanguine Art"] = true
}

-- Helper to identify if a tool is a fighting style (melee)
local function isFightingStyle(item)
    if item:IsA("Tool") then
        local name = item.Name
        local toolType = item:GetAttribute("Type") or ""
        if toolType == "Melee" or FIGHTING_STYLES[name] or string_find(name, "Style", 1, true) then
            return true
        end
    end
    return false
end

-- Get current equipped fighting style (checks character and backpack, no network remotes)
local function getEquippedFightingStyle()
    local char = LocalPlayer.Character
    if char then
        for _, item in ipairs(char:GetChildren()) do
            if isFightingStyle(item) then
                return item.Name
            end
        end
    end
    local backpack = LocalPlayer:FindFirstChild("Backpack")
    if backpack then
        for _, item in ipairs(backpack:GetChildren()) do
            if isFightingStyle(item) then
                return item.Name
            end
        end
    end
    return "Combat"
end

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
        if string_find(name, k, 1, true) then return true end
    end
    return false
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
            
            if string_find(name, "Fruit", 1, true) then
                table_insert(inventory.fruits, name)
            elseif toolType == "Sword" or string_find(name, "Katana", 1, true) or string_find(name, "Blade", 1, true) or string_find(name, "Scythe", 1, true) or string_find(name, "Trident", 1, true) or string_find(name, "Saber", 1, true) or string_find(name, "Anchor", 1, true) then
                table_insert(inventory.swords, name)
            elseif toolType == "Gun" or string_find(name, "Guitar", 1, true) or string_find(name, "Rifle", 1, true) or string_find(name, "Revolver", 1, true) or string_find(name, "Slingshot", 1, true) or string_find(name, "Bow", 1, true) then
                table_insert(inventory.guns, name)
            elseif isFightingStyle(item) then
                table_insert(inventory.styles, name)
            end
        elseif item:IsA("Accessory") then
            local name = item.Name
            if isBFAccessory(name) then
                table_insert(inventory.accessories, name)
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
                        table_insert(inventory.materials, {
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
                        table_insert(inventory.swords, item.Name)
                    elseif itemType == "Gun" then
                        table_insert(inventory.guns, item.Name)
                    elseif itemType == "Wear" or itemType == "Accessory" then
                        table_insert(inventory.accessories, item.Name)
                    elseif itemType == "Material" then
                        local quantity = item.Count or item.Quantity or item.Value or 1
                        if not materialsMap[item.Name] then
                            materialsMap[item.Name] = quantity
                            table_insert(inventory.materials, {
                                name = item.Name,
                                quantity = quantity
                            })
                        end
                    elseif itemType == "Blox Fruit" or itemType == "Fruit" then
                        table_insert(inventory.fruits, item.Name)
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
                        table_insert(inventory.fruits, name .. " (x" .. tostring(qty) .. ")")
                    end
                elseif type(v) == "number" and type(k) == "string" then
                    if v > 0 then
                        table_insert(inventory.fruits, k .. " (x" .. tostring(v) .. ")")
                    end
                elseif type(v) == "string" then
                    table_insert(inventory.fruits, v)
                end
            end
        end
    end

    -- Fallback to local scan for swords/guns/accessories/fruits if remote scanning failed or was not available
    if not scannedViaRemote then
        -- Check Backpack
        local backpack = LocalPlayer:FindFirstChild("Backpack")
        if backpack then
            for _, item in ipairs(backpack:GetChildren()) do
                parseItem(item)
            end
        end
        
        -- Check currently equipped item in Character
        local char = LocalPlayer.Character
        if char then
            for _, item in ipairs(char:GetChildren()) do
                parseItem(item)
            end
        end
    end

    -- Always scan the currently equipped fighting style and add to styles inventory if not already present
    local equippedStyle = getEquippedFightingStyle()
    if equippedStyle then
        local found = false
        for _, val in ipairs(inventory.styles) do
            if val == equippedStyle then
                found = true
                break
            end
        end
        if not found then
            table_insert(inventory.styles, equippedStyle)
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

    local function checkItem(item)
        if item:IsA("Tool") then
            local name = item.Name
            local toolType = item:GetAttribute("Type") or ""
            if string_find(name, "Fruit", 1, true) then
                details.fruit = name
            elseif toolType == "Sword" or string_find(name, "Katana", 1, true) or string_find(name, "Blade", 1, true) or string_find(name, "Scythe", 1, true) or string_find(name, "Trident", 1, true) or string_find(name, "Saber", 1, true) or string_find(name, "Anchor", 1, true) then
                details.sword = name
            elseif toolType == "Gun" or string_find(name, "Guitar", 1, true) or string_find(name, "Rifle", 1, true) or string_find(name, "Revolver", 1, true) or string_find(name, "Slingshot", 1, true) or string_find(name, "Bow", 1, true) then
                details.gun = name
            end
        end
    end

    -- First detect what is actively equipped on the Character
    local char = LocalPlayer.Character
    if char then
        for _, item in ipairs(char:GetChildren()) do
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
    local backpack = LocalPlayer:FindFirstChild("Backpack")
    if backpack then
        if details.sword == "None" then
            for _, item in ipairs(backpack:GetChildren()) do
                if string_find(item.Name, "Katana", 1, true) or string_find(item.Name, "Blade", 1, true) or string_find(item.Name, "Scythe", 1, true) or string_find(item.Name, "Trident", 1, true) or string_find(item.Name, "Saber", 1, true) or string_find(item.Name, "Anchor", 1, true) then
                    details.sword = item.Name
                    break
                end
            end
        end
        if details.gun == "None" then
            for _, item in ipairs(backpack:GetChildren()) do
                if string_find(item.Name, "Guitar", 1, true) or string_find(item.Name, "Rifle", 1, true) or string_find(item.Name, "Revolver", 1, true) or string_find(item.Name, "Slingshot", 1, true) or string_find(item.Name, "Bow", 1, true) then
                    details.gun = item.Name
                    break
                end
            end
        end
    end

    -- Detect Fighting Style from Character (in hand) or Backpack (hotbar)
    local foundStyle = false
    if char then
        for _, item in ipairs(char:GetChildren()) do
            if isFightingStyle(item) then
                details.fightingStyle = item.Name
                foundStyle = true
                break
            end
        end
    end
    if not foundStyle and backpack then
        for _, item in ipairs(backpack:GetChildren()) do
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
MainFrame.Size = UDim2.new(0, 360, 0, 180)
MainFrame.Position = UDim2.new(0.5, -180, 0.4, -90)
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

-- Connected Monitor Screen (Always visible, starts syncing immediately)
local MonitorScreen = Instance.new("Frame")
MonitorScreen.Name = "MonitorScreen"
MonitorScreen.Size = UDim2.new(1, 0, 0.75, 0)
MonitorScreen.Position = UDim2.new(0, 0, 0.25, 0)
MonitorScreen.BackgroundTransparency = 1
MonitorScreen.Visible = true
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
StatsFrame.Size = UDim2.new(0.9, 0, 0.7, 0)
StatsFrame.Position = UDim2.new(0.05, 0, 0.25, 0)
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
LevelLabel.Text = "Level: -- / 2800"
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

-- Helper to format Beli/Fragments numbers with commas without global namespace leakage
local function formatComma(amount)
    local formatted = tostring(amount)
    local k
    repeat
        formatted, k = string_gsub(formatted, "^(-?%d+)(%d%d%d)", "%1,%2")
    until k == 0
    return formatted
end

local lastSendTime = 0

-- Main Ingestion Sync Function
local function sendStats()
    lastSendTime = tick()
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
    LevelLabel.Text = "Level: " .. formatComma(level) .. " / 2800"
    BeliLabel.Text = "Beli: $" .. formatComma(beli) .. "  |  Fragments: " .. formatComma(fragments)
    IslandLabel.Text = "Island: " .. getIslandName() .. " (Sea " .. getSea() .. ")"
    
    -- Determine farming status
    local status = "idle"
    local myChar = LocalPlayer.Character
    local myHrp = myChar and myChar:FindFirstChild("HumanoidRootPart")
    local myHumanoid = myChar and myChar:FindFirstChild("Humanoid")
    
    if myHumanoid and myHumanoid.MoveDirection.Magnitude > 0 then
        status = "grinding"
    end
    
    local targetFolder = workspace:FindFirstChild("Enemies")
    if targetFolder and myHrp then
        for _, enemy in ipairs(targetFolder:GetChildren()) do
            local enemyHumanoid = enemy:FindFirstChild("Humanoid")
            local enemyHrp = enemy:FindFirstChild("HumanoidRootPart")
            if enemyHumanoid and enemyHumanoid.Health > 0 and enemyHrp then
                local dist = (myHrp.Position - enemyHrp.Position).Magnitude
                if dist < 150 then
                    if enemy:GetAttribute("IsBoss") or string_find(enemy.Name, "Boss", 1, true) or enemyHumanoid.MaxHealth > 500000 then
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
        
        local successReq, response = pcall(requestLib, {
            Url = _G.OceanForgeServerUrl .. "/api/lua/update",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-api-key"] = _G.OceanForgeApiKey
            },
            Body = jsonPayload
        })

        local statusCode = response and (response.StatusCode or response.status or response.status_code)
        if successReq and response and statusCode == 200 then
            LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68) -- Neon Red success
            print("OceanForge: Synchronized stats successfully.")
        else
            LedIndicator.BackgroundColor3 = Color3.fromRGB(127, 29, 29) -- Dim Red failure
            local errMsg = "unknown"
            if not successReq then
                errMsg = tostring(response)
            elseif response then
                errMsg = tostring(statusCode or "unknown")
            end
            warn("OceanForge: Synchronization failed. Error/Status: " .. errMsg)
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

    -- Observe fighting style changes and send immediate updates (throttled to 15s to prevent server load)
    task.spawn(function()
        local lastFightingStyle = getEquippedFightingStyle()
        while heartbeatLoopActive do
            local currentStyle = getEquippedFightingStyle()
            if currentStyle ~= lastFightingStyle then
                lastFightingStyle = currentStyle -- Update immediately to prevent duplicate triggers
                
                task.spawn(function()
                    local timeSinceLastSend = tick() - lastSendTime
                    if timeSinceLastSend < 15 then
                        task.wait(15 - timeSinceLastSend)
                    end
                    
                    -- Check if it's still the current style before sending
                    if getEquippedFightingStyle() == currentStyle then
                        print("OceanForge: Fighting style changed to " .. tostring(currentStyle) .. ". Sending update...")
                        local success, err = pcall(sendStats)
                        if not success then
                            warn("OceanForge: Error in sendStats: " .. tostring(err))
                        end
                    end
                end)
            end
            task.wait(1)
        end
    end)

    task.spawn(function()
        while heartbeatLoopActive do
            local success, err = pcall(sendStats)
            if not success then
                warn("OceanForge: Error in sendStats: " .. tostring(err))
            end
            task.wait(_G.OceanForgeHeartbeatInterval)
        end
    end)
end

local function stopHeartbeatScheduler()
    heartbeatLoopActive = false
    LedIndicator.BackgroundColor3 = Color3.fromRGB(127, 29, 29) -- Dim Red stopped
end

-- Global cleanup handle for re-runs
_G.OceanForgeCleanup = function()
    stopHeartbeatScheduler()
    if ScreenGui then
        pcall(function() ScreenGui:Destroy() end)
    end
    if pulseTween then
        pcall(function() pulseTween:Cancel() end)
    end
end

-- Helper to load saved API key from file
local function loadSavedKey()
    if isfile and readfile and isfile("crimsonforge_key.json") then
        local success, rawData = pcall(readfile, "crimsonforge_key.json")
        if success and rawData then
            local decodeSuccess, data = pcall(function()
                return HttpService:JSONDecode(rawData)
            end)
            if decodeSuccess and type(data) == "table" and data.key and data.save_day and data.save_year then
                local now = os_date("*t")
                if now.year ~= data.save_year or now.yday ~= data.save_day then
                    -- Different/later day, delete file and do not load
                    if delfile then
                        pcall(delfile, "crimsonforge_key.json")
                    end
                    print("CrimsonForge: Saved API key has expired (tomorrow reached) and was deleted.")
                else
                    return data.key
                end
            end
        end
    end
    return nil
end

-- Helper to save API key to file
local function saveKey(key)
    if writefile and HttpService and os_date then
        pcall(function()
            local now = os_date("*t")
            if now then
                local data = {
                    key = key,
                    save_day = now.yday,
                    save_year = now.year
                }
                writefile("crimsonforge_key.json", HttpService:JSONEncode(data))
            end
        end)
    end
end

-- Start the engine automatically
local savedKey = loadSavedKey()
if _G.OceanForgeApiKey and _G.OceanForgeApiKey ~= "" and _G.OceanForgeApiKey ~= "YOUR_API_KEY_HERE" then
    saveKey(_G.OceanForgeApiKey)
    startHeartbeatScheduler()
elseif savedKey and savedKey ~= "" then
    _G.OceanForgeApiKey = savedKey
    startHeartbeatScheduler()
else
    startHeartbeatScheduler()
end

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

-- Custom smooth dragging controller
local function makeDraggable(frame)
    local dragToggle = false
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

    game:GetService("UserInputService").InputEnded:Connect(function(input)
        if (input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch) then
            dragToggle = false
        end
    end)
end

-- Make both windows draggable
makeDraggable(MainFrame)
makeDraggable(AnchorBtn)
