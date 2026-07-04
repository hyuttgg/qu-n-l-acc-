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

-- Determine Current Sea based on Roblox Place ID
local function getSea()
    local placeId = game.PlaceId
    if placeId == 2753915549 then
        return 1
    elseif placeId == 4442272183 then
        return 2
    elseif placeId == 7449423635 then
        return 3
    else
        return 1 -- Default fallback
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

    -- Scan Stored Materials
    local dataFolder = LocalPlayer:FindFirstChild("Data")
    if dataFolder then
        local inventoryFolder = dataFolder:FindFirstChild("Inventory") or dataFolder:FindFirstChild("Materials")
        if inventoryFolder then
            for _, mat in ipairs(inventoryFolder:GetChildren()) do
                if mat:IsA("NumberValue") or mat:IsA("IntValue") then
                    if mat.Value > 0 then
                        table.insert(inventory.materials, {
                            name = mat.Name,
                            quantity = mat.Value
                        })
                    end
                end
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
        fightingStyle = "Combat"
    }

    if LocalPlayer.Character then
        for _, item in ipairs(LocalPlayer.Character:GetChildren()) do
            if item:IsA("Tool") then
                local name = item.Name
                if name:find("Fruit") then
                    details.fruit = name
                elseif name:find("Katana") or name:find("Blade") or name:find("Scythe") or name:find("Trident") or name:find("Saber") or name:find("Anchor") then
                    details.sword = name
                elseif name:find("Guitar") or name:find("Rifle") or name:find("Revolver") or name:find("Slingshot") or name:find("Bow") then
                    details.gun = name
                elseif name:find("Style") or name == "Godhuman" or name == "Superhuman" or name == "Dragon Talon" or name == "Sharkman Karate" or name == "Death Step" then
                    details.fightingStyle = name
                end
            end
        end
    end

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
        
        local fruitVal = stats:FindFirstChild("FruitName") or stats:FindFirstChild("Fruit")
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

-- Main Window Frame (Themed glassmorphism navy)
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 360, 0, 260)
MainFrame.Position = UDim2.new(0.5, -180, 0.4, -130)
MainFrame.BackgroundColor3 = Color3.fromRGB(11, 19, 41) -- Dark Navy
MainFrame.BackgroundTransparency = 0.15
MainFrame.BorderSizePixel = 0
MainFrame.Active = true
MainFrame.Draggable = true
MainFrame.Parent = ScreenGui

local MainCorner = Instance.new("UICorner")
MainCorner.CornerRadius = UDim.new(0, 12)
MainCorner.Parent = MainFrame

-- Neon Gold Border
local MainStroke = Instance.new("UIStroke")
MainStroke.Thickness = 1.5
MainStroke.Color = Color3.fromRGB(212, 175, 55) -- Gold
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
Title.Text = "⚓ OCEANFORGE CLIENT"
Title.TextColor3 = Color3.fromRGB(212, 175, 55) -- Gold
Title.Font = Enum.Font.GothamBold
Title.TextSize = 15
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = Topbar

local TopDivider = Instance.new("Frame")
TopDivider.Size = UDim2.new(0.9, 0, 0, 1)
TopDivider.Position = UDim2.new(0.05, 0, 1, 0)
TopDivider.BackgroundColor3 = Color3.fromRGB(58, 80, 107) -- Slate Blue
TopDivider.BorderSizePixel = 0
TopDivider.Parent = Topbar

-- Minimize Button
local MinBtn = Instance.new("TextButton")
MinBtn.Name = "MinBtn"
MinBtn.Size = UDim2.new(0, 30, 0, 30)
MinBtn.Position = UDim2.new(0.9, -15, 0.5, -15)
MinBtn.BackgroundTransparency = 1
MinBtn.Text = "−"
MinBtn.TextColor3 = Color3.fromRGB(212, 175, 55)
MinBtn.Font = Enum.Font.GothamBold
MinBtn.TextSize = 18
MinBtn.Parent = Topbar

-- Minimized Anchor Button (Floating anchor on corner)
local AnchorBtn = Instance.new("TextButton")
AnchorBtn.Name = "AnchorBtn"
AnchorBtn.Size = UDim2.new(0, 50, 0, 50)
AnchorBtn.Position = UDim2.new(0.95, -50, 0.85, -50)
AnchorBtn.BackgroundColor3 = Color3.fromRGB(11, 19, 41)
AnchorBtn.TextColor3 = Color3.fromRGB(212, 175, 55)
AnchorBtn.Text = "⚓"
AnchorBtn.Font = Enum.Font.GothamBold
AnchorBtn.TextSize = 24
AnchorBtn.Visible = false
AnchorBtn.Parent = ScreenGui

local AnchorCorner = Instance.new("UICorner")
AnchorCorner.CornerRadius = UDim.new(0, 25)
AnchorCorner.Parent = AnchorBtn

local AnchorStroke = Instance.new("UIStroke")
AnchorStroke.Thickness = 1.5
AnchorStroke.Color = Color3.fromRGB(212, 175, 55)
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
IngestDesc.Text = "Enter your OceanForge API key to connect this bot instance to your web dashboard."
IngestDesc.TextColor3 = Color3.fromRGB(203, 213, 225) -- Light Slate
IngestDesc.Font = Enum.Font.GothamSemibold
IngestDesc.TextSize = 12
IngestDesc.TextWrapped = true
IngestDesc.Parent = IngestScreen

local KeyBox = Instance.new("TextBox")
KeyBox.Name = "KeyBox"
KeyBox.Size = UDim2.new(0.9, 0, 0.22, 0)
KeyBox.Position = UDim2.new(0.05, 0, 0.38, 0)
KeyBox.BackgroundColor3 = Color3.fromRGB(2, 6, 23) -- Deep Abyss
KeyBox.TextColor3 = Color3.fromRGB(255, 255, 255)
KeyBox.PlaceholderText = "Paste api key here..."
KeyBox.PlaceholderColor3 = Color3.fromRGB(91, 192, 190) -- Cyan
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
KeyStroke.Color = Color3.fromRGB(58, 80, 107)
KeyStroke.Parent = KeyBox

local ConnectBtn = Instance.new("TextButton")
ConnectBtn.Name = "ConnectBtn"
ConnectBtn.Size = UDim2.new(0.9, 0, 0.22, 0)
ConnectBtn.Position = UDim2.new(0.05, 0, 0.68, 0)
ConnectBtn.BackgroundColor3 = Color3.fromRGB(212, 175, 55) -- Gold
ConnectBtn.TextColor3 = Color3.fromRGB(2, 6, 23)
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
LedIndicator.BackgroundColor3 = Color3.fromRGB(16, 185, 129) -- Emerald green
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
LedLabel.TextColor3 = Color3.fromRGB(16, 185, 129) -- Emerald
LedLabel.Font = Enum.Font.GothamBold
LedLabel.TextSize = 11
LedLabel.TextXAlignment = Enum.TextXAlignment.Left
LedLabel.Parent = MonitorScreen

-- Account details breakdown (Gold glow styles)
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
LevelLabel.TextColor3 = Color3.fromRGB(91, 192, 190) -- Cyan
LevelLabel.Font = Enum.Font.GothamSemibold
LevelLabel.TextSize = 12
LevelLabel.TextXAlignment = Enum.TextXAlignment.Left
LevelLabel.Parent = StatsFrame

local BeliLabel = Instance.new("TextLabel")
BeliLabel.Size = UDim2.new(1, 0, 0.25, 0)
BeliLabel.Position = UDim2.new(0, 0, 0.5, 0)
BeliLabel.BackgroundTransparency = 1
BeliLabel.Text = "Beli: $0"
BeliLabel.TextColor3 = Color3.fromRGB(16, 185, 129) -- Green
BeliLabel.Font = Enum.Font.GothamSemibold
BeliLabel.TextSize = 12
BeliLabel.TextXAlignment = Enum.TextXAlignment.Left
BeliLabel.Parent = StatsFrame

local IslandLabel = Instance.new("TextLabel")
IslandLabel.Size = UDim2.new(1, 0, 0.25, 0)
IslandLabel.Position = UDim2.new(0, 0, 0.75, 0)
IslandLabel.BackgroundTransparency = 1
IslandLabel.Text = "Island: Scanning..."
IslandLabel.TextColor3 = Color3.fromRGB(203, 213, 225)
IslandLabel.Font = Enum.Font.GothamSemibold
IslandLabel.TextSize = 12
IslandLabel.TextXAlignment = Enum.TextXAlignment.Left
IslandLabel.Parent = StatsFrame

local DisconnectBtn = Instance.new("TextButton")
DisconnectBtn.Name = "DisconnectBtn"
DisconnectBtn.Size = UDim2.new(0.9, 0, 0.18, 0)
DisconnectBtn.Position = UDim2.new(0.05, 0, 0.78, 0)
DisconnectBtn.BackgroundColor3 = Color3.fromRGB(2, 6, 23)
DisconnectBtn.TextColor3 = Color3.fromRGB(239, 68, 68) -- Red
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
        LedIndicator.BackgroundColor3 = Color3.fromRGB(212, 175, 55) -- gold during request
        
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
            LedIndicator.BackgroundColor3 = Color3.fromRGB(16, 185, 129) -- emerald success
            print("OceanForge: Synchronized stats successfully.")
        else
            LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68) -- red failure
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
    LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
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
