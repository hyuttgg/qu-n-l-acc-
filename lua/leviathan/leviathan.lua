-- =====================================================================
-- OCEANFORGE: LEVIATHAN TELEMETRY AGENT (CONSOLIDATED)
-- =====================================================================
-- Single-file consolidated script for Roblox executors.
-- Observes in-game states and reports back to the server.
-- NO GAMEPLAY AUTOMATION - READ ONLY.
-- =====================================================================

_G.ApiKey = "" -- Optionally paste your API key here
_G.ServerUrl = "https://quan-ly-acc-viet-nam.onrender.com" -- Change to your hosted backend URL if deployed
_G.HeartbeatInterval = 15 -- Heartbeat in seconds

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- ---------------------------------------------------------------------
-- 1. SPY DIALOGUE OBSERVER
-- ---------------------------------------------------------------------
local Spy = {}
function Spy.getSpyMessage()
    local LocalPlayer = Players.LocalPlayer
    local playerGui = LocalPlayer:FindFirstChild("PlayerGui")
    if playerGui then
        local dialogueGui = playerGui:FindFirstChild("DialogueGui") or playerGui:FindFirstChild("NPCShop")
        if dialogueGui and dialogueGui.Enabled then
            local textLabel = dialogueGui:FindFirstChildOfClass("TextLabel", true)
            if textLabel and textLabel.Visible and textLabel.Text ~= "" then
                return textLabel.Text
            end
        end
    end
    return "I don't know anything yet."
end

-- ---------------------------------------------------------------------
-- 2. CREW VITALS OBSERVER
-- ---------------------------------------------------------------------
local Crew = {}

local function findActiveBoat()
    local char = Players.LocalPlayer.Character
    if not char then return nil end
    
    -- Check if local player is sitting in a seat
    local humanoid = char:FindFirstChildOfClass("Humanoid")
    if humanoid and humanoid.SeatPart then
        local model = humanoid.SeatPart:FindFirstAncestorOfClass("Model")
        while model and model.Parent ~= workspace and model.Parent.Name ~= "Boats" do
            model = model.Parent:FindFirstAncestorOfClass("Model")
        end
        return model
    end
    
    -- Scan nearby boats in workspace
    local root = char:FindFirstChild("HumanoidRootPart")
    if root then
        local pos = root.Position
        local boatsFolder = workspace:FindFirstChild("Boats") or workspace:FindFirstChild("Ships")
        local searchContainer = boatsFolder or workspace
        
        local closestBoat = nil
        local closestDist = 150 -- studs
        
        for _, child in ipairs(searchContainer:GetChildren()) do
            if child:IsA("Model") and (child.Name:find("Boat") or child.Name:find("Ship") or child:FindFirstChildOfClass("VehicleSeat")) then
                local prim = child.PrimaryPart or child:FindFirstChildOfClass("Part") or child:FindFirstChildOfClass("MeshPart")
                if prim then
                    local dist = (prim.Position - pos).Magnitude
                    if dist < closestDist then
                        closestDist = dist
                        closestBoat = child
                    end
                end
            end
        end
        return closestBoat
    end
    return nil
end

function Crew.getCrewDetails()
    local crew = {}
    local found = {}
    
    local activeBoat = findActiveBoat()
    if activeBoat then
        -- 1. Scan occupied seats on the boat
        for _, obj in ipairs(activeBoat:GetDescendants()) do
            if obj:IsA("Seat") or obj:IsA("VehicleSeat") then
                local occupant = obj.Occupant
                if occupant then
                    local char = occupant.Parent
                    local player = Players:GetPlayerFromCharacter(char)
                    if player and not found[player.Name] then
                        found[player.Name] = true
                        table.insert(crew, {
                            username = player.Name,
                            alive = occupant.Health > 0,
                            dead = occupant.Health <= 0
                        })
                    end
                end
            end
        end
        
        -- 2. Scan players standing close to the boat's center part
        local primPart = activeBoat.PrimaryPart or activeBoat:FindFirstChildOfClass("Part") or activeBoat:FindFirstChildOfClass("MeshPart")
        if primPart then
            local boatPos = primPart.Position
            for _, player in ipairs(Players:GetChildren()) do
                if player:IsA("Player") and not found[player.Name] then
                    local char = player.Character
                    if char and char:FindFirstChild("HumanoidRootPart") and char:FindFirstChild("Humanoid") then
                        local dist = (char.HumanoidRootPart.Position - boatPos).Magnitude
                        if dist < 85 then -- radius of deck area
                            found[player.Name] = true
                            table.insert(crew, {
                                username = player.Name,
                                alive = char.Humanoid.Health > 0,
                                dead = char.Humanoid.Health <= 0
                            })
                        end
                    end
                end
            end
        end
    end
    
    -- Fallback: If no boat found, report nearby players around local player
    if #crew == 0 then
        local localChar = Players.LocalPlayer.Character
        local localPos = localChar and localChar:FindFirstChild("HumanoidRootPart") and localChar.HumanoidRootPart.Position
        for _, player in ipairs(Players:GetChildren()) do
            if player:IsA("Player") then
                local char = player.Character
                local alive = false
                if char and char:FindFirstChild("Humanoid") and char.Humanoid.Health > 0 then
                    alive = true
                end

                local inRange = false
                if localPos and char and char:FindFirstChild("HumanoidRootPart") then
                    local dist = (char.HumanoidRootPart.Position - localPos).Magnitude
                    if dist < 300 then
                        inRange = true
                    end
                end

                if inRange or player == Players.LocalPlayer then
                    table.insert(crew, {
                        username = player.Name,
                        alive = alive,
                        dead = not alive
                    })
                end
            end
        end
    end
    
    return crew
end

-- ---------------------------------------------------------------------
-- 3. SEA DANGER OBSERVER
-- ---------------------------------------------------------------------
local Danger = {}
function Danger.getDangerLevel()
    local LocalPlayer = Players.LocalPlayer
    local playerGui = LocalPlayer:FindFirstChild("PlayerGui")
    if playerGui then
        local seaIndicator = playerGui:FindFirstChild("SeaIndicator", true) or playerGui:FindFirstChild("Compass", true)
        if seaIndicator then
            local label = seaIndicator:FindFirstChild("DangerText", true) or seaIndicator:FindFirstChild("LevelText", true)
            if label then
                local level = tonumber(label.Text:match("%d+"))
                if level then return level end
            end
        end
    end
    
    local char = LocalPlayer.Character
    if char and char:FindFirstChild("HumanoidRootPart") then
        local pos = char.HumanoidRootPart.Position
        local dist = pos.Magnitude
        if dist > 15000 then return 6
        elseif dist > 12000 then return 5
        elseif dist > 9000 then return 4
        elseif dist > 6000 then return 3
        elseif dist > 3000 then return 2
        else return 1
        end
    end
    return 1
end

-- ---------------------------------------------------------------------
-- 4. CURRENT REGION / WATCHER OBSERVER
-- ---------------------------------------------------------------------
local Region = {}
function Region.getCurrentRegion()
    local localChar = Players.LocalPlayer.Character
    if not localChar or not localChar:FindFirstChild("HumanoidRootPart") then
        return ""
    end

    local pos = localChar.HumanoidRootPart.Position
    local map = workspace:FindFirstChild("Map") or workspace
    
    local frozenWatcher = map:FindFirstChild("FrozenWatcher") or map:FindFirstChild("Frozen Watcher")
    if frozenWatcher then
        local center = frozenWatcher:FindFirstChildOfClass("Part") or frozenWatcher:FindFirstChildOfClass("MeshPart")
        if center then
            local dist = (pos - center.Position).Magnitude
            if dist < 2500 then
                return "Frozen Watcher"
            end
        end
    end
    
    for _, obj in ipairs(workspace:GetChildren()) do
        if obj.Name:find("Frozen") or obj.Name:find("Watcher") then
            return "Frozen Watcher"
        end
    end
    return "Rough Seas"
end

-- ---------------------------------------------------------------------
-- 5. MATERIAL INVENTORY OBSERVER
-- ---------------------------------------------------------------------
local Inventory = {}
function Inventory.getLeviathanMaterials()
    local scale = 0
    local fins = 0
    local LocalPlayer = Players.LocalPlayer
    local data = LocalPlayer:FindFirstChild("Data")
    if data then
        local inventoryFolder = data:FindFirstChild("Inventory") or data:FindFirstChild("Materials")
        if inventoryFolder then
            local scaleVal = inventoryFolder:FindFirstChild("Leviathan Scale") or inventoryFolder:FindFirstChild("LeviathanScale")
            if scaleVal then scale = scaleVal.Value end

            local finVal = inventoryFolder:FindFirstChild("Leviathan Tail") or inventoryFolder:FindFirstChild("Fish Tail")
            if finVal then fins = finVal.Value end
        end
    end
    return scale, fins
end

-- ---------------------------------------------------------------------
-- 6. LEVIATHAN HEART OBSERVER
-- ---------------------------------------------------------------------
local Heart = {}
function Heart.checkHeartStatus()
    local heartDetected = false
    local heartDestination = ""

    for _, obj in ipairs(workspace:GetChildren()) do
        if obj.Name:find("Heart") or obj.Name:find("LeviathanHeart") then
            heartDetected = true
            heartDestination = "Tiki Outpost"
            break
        end
    end

    local boats = workspace:FindFirstChild("Boats") or workspace:FindFirstChild("Ships")
    if boats then
        for _, boat in ipairs(boats:GetChildren()) do
            if boat:FindFirstChild("HeartHooked") or boat:FindFirstChild("LeviathanHeart") then
                heartDetected = true
                heartDestination = "Tiki Outpost"
                break
            end
        end
    end
    return heartDetected, heartDestination
end

-- ---------------------------------------------------------------------
-- 7. EVENT MAPPER
-- ---------------------------------------------------------------------
local Events = {}
function Events.getSessionEvents(status)
    local eventTimeline = "Preparing"
    if status == "Fighting" then
        eventTimeline = "Battle"
    elseif status == "Heart Obtained" then
        eventTimeline = "Heart Retrieved"
    elseif status == "Finished" then
        eventTimeline = "Finished"
    elseif status == "Activated" then
        eventTimeline = "Leviathan Spawn"
    end
    return eventTimeline
end

-- ---------------------------------------------------------------------
-- 8. HTTPS API DISPATCHER
-- ---------------------------------------------------------------------
local Sender = {}
function Sender.sendData(url, apiKey, payload)
    local success, jsonPayload = pcall(function()
        return HttpService:JSONEncode(payload)
    end)
    if not success then
        warn("LeviathanManager: Failed to serialize data payload.")
        return false
    end
  
    local requestLib = (syn and syn.request) or (http and http.request) or request or http_request
    if not requestLib then
        warn("LeviathanManager: HTTP request executor function not found!")
        return false
    end
  
    local successPost, response = pcall(function()
        return requestLib({
            Url = url .. "/api/leviathan/update",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-api-key"] = apiKey
            },
            Body = jsonPayload
        })
    end)
  
    if successPost and response and response.StatusCode == 200 then
        return true
    else
        warn("LeviathanManager: Failed to send data. Status: " .. tostring(response and response.StatusCode or "Error"))
        return false
    end
end

-- ---------------------------------------------------------------------
-- 9. PREMIUM GREEN LEVIATHAN GUI CONSTRUCTION
-- ---------------------------------------------------------------------
local StatusLabel, SpyLabel, DangerLabel, MaterialLabel, RegionLabel, LedIndicator

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "OceanForgeLeviathanGui"
ScreenGui.ResetOnSpawn = false

local successCore, coreGui = pcall(function() return game:GetService("CoreGui") end)
if successCore and coreGui then
    ScreenGui.Parent = coreGui
else
    ScreenGui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")
end

local TweenService = game:GetService("TweenService")

-- Main Frame (Dark green navy with emerald border)
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 360, 0, 180)
MainFrame.Position = UDim2.new(0.5, -180, 0.4, -90)
MainFrame.BackgroundColor3 = Color3.fromRGB(11, 25, 23)
MainFrame.BackgroundTransparency = 0.15
MainFrame.BorderSizePixel = 0
MainFrame.Active = true
MainFrame.Draggable = true
MainFrame.Parent = ScreenGui

local MainCorner = Instance.new("UICorner")
MainCorner.CornerRadius = UDim.new(0, 12)
MainCorner.Parent = MainFrame

local MainStroke = Instance.new("UIStroke")
MainStroke.Thickness = 1.5
MainStroke.Color = Color3.fromRGB(16, 185, 129) -- Emerald
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
Title.Text = "🐲 LEVIATHAN MONITOR"
Title.TextColor3 = Color3.fromRGB(16, 185, 129)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 14
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = Topbar

-- Led Indicator
LedIndicator = Instance.new("Frame")
LedIndicator.Name = "LedIndicator"
LedIndicator.Size = UDim2.new(0, 10, 0, 10)
LedIndicator.Position = UDim2.new(0.82, 0, 0.5, -5)
LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68) -- Starts red
LedIndicator.BorderSizePixel = 0
LedIndicator.Parent = Topbar

local LedCorner = Instance.new("UICorner")
LedCorner.CornerRadius = UDim.new(0, 5)
LedCorner.Parent = LedIndicator

local MinBtn = Instance.new("TextButton")
MinBtn.Name = "MinBtn"
MinBtn.Size = UDim2.new(0, 30, 0, 30)
MinBtn.Position = UDim2.new(0.9, -5, 0.5, -15)
MinBtn.BackgroundTransparency = 1
MinBtn.Text = "−"
MinBtn.TextColor3 = Color3.fromRGB(16, 185, 129)
MinBtn.Font = Enum.Font.GothamBold
MinBtn.TextSize = 18
MinBtn.Parent = Topbar

local TopDivider = Instance.new("Frame")
TopDivider.Size = UDim2.new(0.9, 0, 0, 1)
TopDivider.Position = UDim2.new(0.05, 0, 1, 0)
TopDivider.BackgroundColor3 = Color3.fromRGB(16, 185, 129)
TopDivider.BackgroundTransparency = 0.5
TopDivider.BorderSizePixel = 0
TopDivider.Parent = Topbar

-- Minimized floating bubble button
local AnchorBtn = Instance.new("TextButton")
AnchorBtn.Name = "AnchorBtn"
AnchorBtn.Size = UDim2.new(0, 50, 0, 50)
AnchorBtn.Position = UDim2.new(0.95, -50, 0.85, -50)
AnchorBtn.BackgroundColor3 = Color3.fromRGB(11, 25, 23)
AnchorBtn.TextColor3 = Color3.fromRGB(16, 185, 129)
AnchorBtn.Text = "🐲"
AnchorBtn.Font = Enum.Font.GothamBold
AnchorBtn.TextSize = 24
AnchorBtn.Visible = false
AnchorBtn.Parent = ScreenGui

local AnchorCorner = Instance.new("UICorner")
AnchorCorner.CornerRadius = UDim.new(0, 25)
AnchorCorner.Parent = AnchorBtn

local AnchorStroke = Instance.new("UIStroke")
AnchorStroke.Thickness = 1.5
AnchorStroke.Color = Color3.fromRGB(16, 185, 129)
AnchorStroke.Parent = AnchorBtn

-- Leviathan Image (Watermark background)
local LeviathanImage = Instance.new("ImageLabel")
LeviathanImage.Name = "LeviathanImage"
LeviathanImage.Size = UDim2.new(0, 140, 0, 140)
LeviathanImage.Position = UDim2.new(0.5, -70, 0.5, -50)
LeviathanImage.BackgroundTransparency = 1
LeviathanImage.Image = "rbxassetid://15264620025" -- Blox Fruits Leviathan Badge Decal
LeviathanImage.ImageColor3 = Color3.fromRGB(16, 185, 129)
LeviathanImage.ImageTransparency = 0.85
LeviathanImage.Parent = MainFrame

-- Monitor Screen (Stats Tracking)
local MonitorScreen = Instance.new("Frame")
MonitorScreen.Name = "MonitorScreen"
MonitorScreen.Size = UDim2.new(1, 0, 0.75, 0)
MonitorScreen.Position = UDim2.new(0, 0, 0.25, 0)
MonitorScreen.BackgroundTransparency = 1
MonitorScreen.Visible = true
MonitorScreen.Parent = MainFrame

local StatsFrame = Instance.new("Frame")
StatsFrame.Size = UDim2.new(0.9, 0, 0.8, 0)
StatsFrame.Position = UDim2.new(0.05, 0, 0.1, 0)
StatsFrame.BackgroundTransparency = 1
StatsFrame.Parent = MonitorScreen

StatusLabel = Instance.new("TextLabel")
StatusLabel.Size = UDim2.new(1, 0, 0.2, 0)
StatusLabel.Position = UDim2.new(0, 0, 0, 0)
StatusLabel.BackgroundTransparency = 1
StatusLabel.Text = "Status: Scan Preparing..."
StatusLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
StatusLabel.Font = Enum.Font.GothamSemibold
StatusLabel.TextSize = 12
StatusLabel.TextXAlignment = Enum.TextXAlignment.Left
StatusLabel.Parent = StatsFrame

SpyLabel = Instance.new("TextLabel")
SpyLabel.Size = UDim2.new(1, 0, 0.2, 0)
SpyLabel.Position = UDim2.new(0, 0, 0.2, 0)
SpyLabel.BackgroundTransparency = 1
SpyLabel.Text = "Spy Message: Checking Dialogues..."
SpyLabel.TextColor3 = Color3.fromRGB(16, 185, 129)
SpyLabel.Font = Enum.Font.GothamSemibold
SpyLabel.TextSize = 11
SpyLabel.TextXAlignment = Enum.TextXAlignment.Left
SpyLabel.Parent = StatsFrame

DangerLabel = Instance.new("TextLabel")
DangerLabel.Size = UDim2.new(1, 0, 0.2, 0)
DangerLabel.Position = UDim2.new(0, 0, 0.4, 0)
DangerLabel.BackgroundTransparency = 1
DangerLabel.Text = "Danger Level: Level I"
DangerLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
DangerLabel.Font = Enum.Font.GothamSemibold
DangerLabel.TextSize = 12
DangerLabel.TextXAlignment = Enum.TextXAlignment.Left
DangerLabel.Parent = StatsFrame

MaterialLabel = Instance.new("TextLabel")
MaterialLabel.Size = UDim2.new(1, 0, 0.2, 0)
MaterialLabel.Position = UDim2.new(0, 0, 0.6, 0)
MaterialLabel.BackgroundTransparency = 1
MaterialLabel.Text = "Scales: 0  |  Fins: 0"
MaterialLabel.TextColor3 = Color3.fromRGB(200, 230, 215)
MaterialLabel.Font = Enum.Font.GothamSemibold
MaterialLabel.TextSize = 12
MaterialLabel.TextXAlignment = Enum.TextXAlignment.Left
MaterialLabel.Parent = StatsFrame

RegionLabel = Instance.new("TextLabel")
RegionLabel.Size = UDim2.new(1, 0, 0.2, 0)
RegionLabel.Position = UDim2.new(0, 0, 0.8, 0)
RegionLabel.BackgroundTransparency = 1
RegionLabel.Text = "Region: Tiki Outpost"
RegionLabel.TextColor3 = Color3.fromRGB(203, 213, 225)
RegionLabel.Font = Enum.Font.GothamSemibold
RegionLabel.TextSize = 12
RegionLabel.TextXAlignment = Enum.TextXAlignment.Left
RegionLabel.Parent = StatsFrame

-- Minimize Animation Connectors
local isMinimized = false
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

-- Dragging Controller
local function makeDraggable(frame)
    local UserInputService = game:GetService("UserInputService")
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

    UserInputService.InputChanged:Connect(function(input)
        if input == dragInput and dragToggle then
            updateInput(input)
        end
    end)
end

makeDraggable(MainFrame)
makeDraggable(AnchorBtn)

-- ---------------------------------------------------------------------
-- 10. COORDINATOR LOOP WITH UI UPDATE
-- ---------------------------------------------------------------------
local Collector = {}
local heartbeatLoopActive = false

local function formatRoman(num)
    local mapping = {"I", "II", "III", "IV", "V", "VI"}
    return mapping[num] or tostring(num)
end

function Collector.collectAndSend(url, apiKey)
    local LocalPlayer = Players.LocalPlayer
    local spyMessage = Spy.getSpyMessage()
    local crew = Crew.getCrewDetails()
    local dangerLevel = Danger.getDangerLevel()
    local currentRegion = Region.getCurrentRegion()
    local scale, fins = Inventory.getLeviathanMaterials()
    local heartDetected, heartDestination = Heart.checkHeartStatus()
    
    local status = "Preparing"
    if spyMessage:find("out there") then
        status = "Activated"
    end
    
    local enemies = workspace:FindFirstChild("Enemies")
    if enemies then
        for _, enemy in ipairs(enemies:GetChildren()) do
            if enemy.Name:find("Leviathan") then
                status = "Fighting"
                break
            end
        end
    end

    if heartDetected then
        status = "Heart Obtained"
    end

    local aliveCount = 0
    local deadCount = 0
    for _, p in ipairs(crew) do
        if p.alive then aliveCount = aliveCount + 1 else deadCount = deadCount + 1 end
    end

    -- Update UI labels
    StatusLabel.Text = "Status: " .. status
    SpyLabel.Text = "Spy: " .. spyMessage:sub(1, 35) .. (spyMessage:len() > 35 and "..." or "")
    DangerLabel.Text = "Danger Level: Danger " .. formatRoman(dangerLevel)
    MaterialLabel.Text = "Scales: " .. tostring(scale) .. "  |  Fins: " .. tostring(fins)
    RegionLabel.Text = "Region: " .. (currentRegion ~= "" and currentRegion or "Sea Area")

    local payload = {
        username = LocalPlayer.Name,
        roblox_username = LocalPlayer.Name,
        serverId = tostring(game.JobId),
        status = status,
        spyMessage = spyMessage,
        dangerLevel = dangerLevel,
        frozenDetected = (currentRegion == "Frozen Watcher"),
        frozenCoordinates = tostring(LocalPlayer.Character and LocalPlayer.Character.PrimaryPart and LocalPlayer.Character.PrimaryPart.Position or ""),
        frozenSea = 6,
        heartStatus = heartDetected and "Obtained" or "Not Obtained",
        destination = heartDestination,
        remainingDistance = 1500,
        partySize = #crew,
        party = crew,
        rewards = {
            scale = scale,
            fins = fins,
            heart = heartDetected and 1 or 0,
            fragments = 0,
            exp = 0,
            otherDrop = {}
        },
        battleStats = {
            damagePhase = 1,
            membersAlive = aliveCount,
            membersDead = deadCount,
            disconnectCount = 0
        }
    }

    LedIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11) -- Yellow pulsing
    
    task.spawn(function()
        local success = Sender.sendData(url, apiKey, payload)
        if success then
            LedIndicator.BackgroundColor3 = Color3.fromRGB(16, 185, 129) -- Emerald Success
        else
            LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68) -- Red Failure
        end
    end)
end

local function startTelemetry()
    if heartbeatLoopActive then return end
    heartbeatLoopActive = true
    
    MonitorScreen.Visible = true

    task.spawn(function()
        local url = _G.ServerUrl or "https://quan-ly-acc-viet-nam.onrender.com"
        local apiKey = _G.ApiKey or "YOUR_API_KEY_HERE"
        local interval = _G.HeartbeatInterval or 15
        
        print("OceanForge: Leviathan Telemetry Agent Activated.")
        
        while heartbeatLoopActive do
            pcall(function()
                Collector.collectAndSend(url, apiKey)
            end)
            task.wait(interval)
        end
    end)
end

-- Auto start telemetry immediately on load
startTelemetry()

return Collector
