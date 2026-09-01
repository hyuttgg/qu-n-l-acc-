-- ==========================================================
-- OceanForge Manager — Roblox Lua Client (GUI Edition)
-- Themed deep-sea navy, gold glows, and premium stats panel
-- Ultra Multi-Script Compatible & Stealth Shield Edition
-- Premium Crimson Velvet Luxury Red Theme
-- ==========================================================

-- Caching standard library functions for maximum performance
local ipairs, pairs, type, tostring = ipairs, pairs, type, tostring
local string_find, string_gsub = string.find, string.gsub
local table_insert = table.insert
local math_huge = math.huge
local pcall, warn, print = pcall, warn, print
local tick, os_date = tick, os.date

-- Environment Isolation & Executor Cross-Compatibility Helper
local getgenv = getgenv or function() return _G end
local env = getgenv()
local cloneref = (cloneref or (syn and syn.cloneref)) or function(obj) return obj end

-- Unique Session Instance Token to prevent multi-instance thread collisions
local currentInstanceToken = tick()
env.OceanForgeInstanceToken = currentInstanceToken
_G.OceanForgeInstanceToken = currentInstanceToken

-- Configuration with Environment Fallbacks
_G.OceanForgeApiKey = _G.OceanForgeApiKey or ""
_G.OceanForgeServerUrl = _G.OceanForgeServerUrl or "https://quan-ly-acc-viet-nam.onrender.com"
env.OceanForgeApiKey = _G.OceanForgeApiKey
env.OceanForgeServerUrl = _G.OceanForgeServerUrl
env.OceanForgeHeartbeatInterval = env.OceanForgeHeartbeatInterval or _G.OceanForgeHeartbeatInterval or 15
env.OceanForgeAntiBan = env.OceanForgeAntiBan ~= false
env.OceanForgeAntiAFK = env.OceanForgeAntiAFK ~= false
env.OceanForgeAntiAdmin = env.OceanForgeAntiAdmin ~= false
env.OceanForgeAutoRejoin = env.OceanForgeAutoRejoin ~= false
env.OceanForgeEnableRemotes = env.OceanForgeEnableRemotes == true

-- Services (Protected with cloneref to bypass service hooking from rival scripts)
local Players = cloneref(game:GetService("Players"))
local HttpService = cloneref(game:GetService("HttpService"))
local TeleportService = cloneref(game:GetService("TeleportService"))
local TweenService = cloneref(game:GetService("TweenService"))
local GuiService = cloneref(game:GetService("GuiService"))
local ScriptContext = cloneref(game:GetService("ScriptContext"))
local UserInputService = cloneref(game:GetService("UserInputService"))
local StarterGui = cloneref(game:GetService("StarterGui"))
local VirtualUser = pcall(function() return cloneref(game:GetService("VirtualUser")) end) and cloneref(game:GetService("VirtualUser")) or nil

local LocalPlayer = Players.LocalPlayer              
while not LocalPlayer do
    task.wait(0.1)
    LocalPlayer = Players.LocalPlayer
end

-- Notification Helper Function for On-Screen Connection Alerts
local function sendNotification(title, text, duration, icon)
    pcall(function()
        StarterGui:SetCore("SendNotification", {
            Title = title,
            Text = text,
            Duration = duration or 5,
            Icon = icon or "rbxassetid://6023426926"
        })
    end)
end

-- Cleanup previous execution to prevent thread and GUI leakage
if env.OceanForgeCleanup then
    pcall(env.OceanForgeCleanup)
elseif _G.OceanForgeCleanup then
    pcall(_G.OceanForgeCleanup)
end

-- Track active connections for clean teardown
local antiBanConnections = {}
local heartbeatLoopActive = false
local lastConnectionStatus = nil -- Track connection state (true = success, false = failed)

-- Executor-compatible HTTP Request helper
local requestLib = (syn and syn.request) or (http and http.request) or request or http_request or (fluxus and fluxus.request) or (krnl and krnl.request)

-- Check if current instance is still valid (stops orphaned threads if script is re-executed)
local function isInstanceValid()
    return env.OceanForgeInstanceToken == currentInstanceToken
end

-- ==========================================================
-- Anti-Ban & Account Protection Engine
-- ==========================================================

-- Server Hop Helper for Anti-Admin & Auto-Rejoin
local function serverHop()
    local placeId = game.PlaceId
    local serversUrl = "https://games.roblox.com/v1/games/" .. tostring(placeId) .. "/servers/Public?sortOrder=Asc&limit=100"
    if requestLib then
        local success, res = pcall(requestLib, {Url = serversUrl, Method = "GET"})
        if success and res and res.Body then
            local decodeSuccess, data = pcall(function() return HttpService:JSONDecode(res.Body) end)
            if decodeSuccess and data and data.data then
                for _, server in ipairs(data.data) do
                    if server.id ~= game.JobId and server.playing < server.maxPlayers then
                        pcall(function()
                            TeleportService:TeleportToPlaceInstance(placeId, server.id, LocalPlayer)
                        end)
                        return
                    end
                end
            end
        end
    end
    -- Fallback teleport to game PlaceId
    pcall(function()
        TeleportService:Teleport(placeId, LocalPlayer)
    end)
end

-- 1. Anti-AFK Engine (Bypasses 20-minute idle kick safely)
local function setupAntiAFK()
    if not env.OceanForgeAntiAFK then return end
    
    local idledConn = LocalPlayer.Idled:Connect(function()
        if env.OceanForgeAntiAFK and isInstanceValid() then
            pcall(function()
                if VirtualUser then
                    VirtualUser:CaptureController()
                    VirtualUser:ClickButton2(Vector2.new(0, 0))
                else
                    cloneref(game:GetService("VirtualInputManager")):SendKeyEvent(true, Enum.KeyCode.Unknown, false, game)
                end
            end)
        end
    end)
    table_insert(antiBanConnections, idledConn)

    -- Periodic Micro Anti-AFK Heartbeat (every 3 minutes)
    task.spawn(function()
        while heartbeatLoopActive and isInstanceValid() do
            task.wait(180)
            if env.OceanForgeAntiAFK and isInstanceValid() then
                pcall(function()
                    if VirtualUser then
                        VirtualUser:CaptureController()
                        VirtualUser:ClickButton2(Vector2.new(0, 0))
                    end
                end)
            end
        end
    end)
end

-- 2. Anti-Admin / Staff Detector (Auto Server Hop on Staff join)
local BLOX_FRUITS_GROUP_ID = 4372130 -- Gamer Robot / Blox Fruits Group
local ADMIN_MIN_RANK = 100 -- Staff, Moderator, Admin rank threshold

local function isStaffMember(player)
    if not player or player == LocalPlayer then return false end
    
    -- Check Group Rank
    local rankSuccess, rank = pcall(function() return player:GetRankInGroup(BLOX_FRUITS_GROUP_ID) end)
    if rankSuccess and rank and rank >= ADMIN_MIN_RANK then
        return true, "Group Rank: " .. tostring(rank)
    end

    -- Check Staff Attributes
    local attrSuccess, isAdmin = pcall(function()
        return player:GetAttribute("IsAdmin") or player:GetAttribute("Admin") or player:GetAttribute("Staff")
    end)
    if attrSuccess and isAdmin == true then
        return true, "Admin Attribute"
    end

    return false
end

local function setupAntiAdmin()
    if not env.OceanForgeAntiAdmin then return end

    local function inspectPlayer(player)
        if not env.OceanForgeAntiAdmin or not isInstanceValid() then return end
        local isStaff, reason = isStaffMember(player)
        if isStaff then
            warn("OceanForge Anti-Ban: Staff member detected (" .. player.Name .. " - " .. tostring(reason) .. ")! Server hopping...")
            sendNotification("🛡️ ANTI-BAN ALERT", "Phát hiện Admin/Staff (" .. player.Name .. ")! Đang chuyển server...", 8)
            task.spawn(serverHop)
        end
    end

    for _, p in ipairs(Players:GetPlayers()) do
        inspectPlayer(p)
    end

    local playerAddedConn = Players.PlayerAdded:Connect(inspectPlayer)
    table_insert(antiBanConnections, playerAddedConn)
end

-- 3. Auto-Rejoin on Kick / Disconnect Screen
local function setupAutoRejoin()
    if not env.OceanForgeAutoRejoin then return end

    local successCore, coreGui = pcall(function() return cloneref(game:GetService("CoreGui")) end)
    if successCore and coreGui then
        local promptOverlay = coreGui:FindFirstChild("PromptOverlay")
        if promptOverlay then
            local childAddedConn = promptOverlay.ChildAdded:Connect(function(child)
                if child.Name == "ErrorPrompt" and env.OceanForgeAutoRejoin and isInstanceValid() then
                    warn("OceanForge Anti-Ban: Disconnect / Kick prompt detected. Auto-rejoining in 5s...")
                    sendNotification("🔄 AUTO REJOIN", "Phát hiện văng game/kick! Đang tự kết nối lại...", 5)
                    task.wait(5)
                    serverHop()
                end
            end)
            table_insert(antiBanConnections, childAddedConn)
            
            if promptOverlay:FindFirstChild("ErrorPrompt") then
                warn("OceanForge Anti-Ban: Active disconnect prompt found. Rejoining...")
                task.spawn(function()
                    task.wait(3)
                    serverHop()
                end)
            end
        end
    end

    local errorConn = GuiService.ErrorMessageChanged:Connect(function()
        if env.OceanForgeAutoRejoin and isInstanceValid() then
            warn("OceanForge Anti-Ban: GuiService error detected. Auto-rejoining in 5s...")
            sendNotification("🔄 AUTO REJOIN", "Phát hiện lỗi GuiService! Đang kết nối lại...", 5)
            task.wait(5)
            serverHop()
        end
    end)
    table_insert(antiBanConnections, errorConn)
end

-- 4. Anti-Error Client Log Suppressor
local function setupAntiErrorLog()
    local scriptErrConn = ScriptContext.Error:Connect(function(message, stackTrace, scriptInst)
        -- Suppress error traces to protect client from log analytics
    end)
    table_insert(antiBanConnections, scriptErrConn)
end

-- Master Anti-Ban Engine Initialization
local function initAntiBanEngine()
    if env.OceanForgeAntiBan == false then return end
    pcall(setupAntiAFK)
    pcall(setupAntiAdmin)
    pcall(setupAutoRejoin)
    pcall(setupAntiErrorLog)
    print("OceanForge Engine: 🛡️ Anti-Ban Engine Active (Stealth & Ultra-Compatible).")
end

-- Determine Current Sea based on Place ID, Workspace Map, and Player Level
local function getSea()
    local placeId = game.PlaceId
    if placeId == 2753915549 then
        return 1
    elseif placeId == 4442272183 then
        return 2
    elseif placeId == 7449423635 then
        return 3
    end

    local map = workspace:FindFirstChild("Map")
    if map then
        for _, child in ipairs(map:GetChildren()) do
            local name = child.Name:lower()
            if string_find(name, "floating turtle", 1, true) or string_find(name, "hydra island", 1, true) or string_find(name, "castle on the sea", 1, true) or string_find(name, "haunted castle", 1, true) or string_find(name, "port town", 1, true) or string_find(name, "great tree", 1, true) then
                return 3
            elseif string_find(name, "kingdom of rose", 1, true) or string_find(name, "green zone", 1, true) or string_find(name, "graveyard", 1, true) or string_find(name, "snow mountain", 1, true) or string_find(name, "hot and cold", 1, true) or string_find(name, "ice castle", 1, true) or string_find(name, "cursed ship", 1, true) or string_find(name, "forgotten island", 1, true) then
                return 2
            elseif string_find(name, "jungle", 1, true) or string_find(name, "pirate village", 1, true) or string_find(name, "desert", 1, true) or string_find(name, "frozen village", 1, true) or string_find(name, "marine fortress", 1, true) or string_find(name, "middle town", 1, true) or string_find(name, "skypiea", 1, true) or string_find(name, "prison", 1, true) or string_find(name, "magma village", 1, true) or string_find(name, "underwater city", 1, true) or string_find(name, "fountain city", 1, true) then
                return 1
            end
        end
    end

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
        return "Unknown Island"
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
    ["Superhuman"] = true, ["Godhuman"] = true, ["Sanguine Art"] = true,
    ["Black Leg"] = true, ["Fishman Karate"] = true, ["Dragon Claw"] = true
}

-- Helper to identify if a tool is a fighting style (melee)
local function isFightingStyle(item)
    if not item or not item:IsA("Tool") then return false end
    local name = item.Name
    if FIGHTING_STYLES[name] then return true end
    local toolTip = ""
    pcall(function() toolTip = item.ToolTip end)
    local toolType = item:GetAttribute("Type") or toolTip or ""
    if toolType == "Melee" or toolType == "Style" then return true end
    if item:FindFirstChild("Melee") or item:FindFirstChild("Combat") then return true end
    local lowerName = name:lower()
    if string_find(lowerName, "style", 1, true) or string_find(lowerName, "step", 1, true) or string_find(lowerName, "karate", 1, true) or string_find(lowerName, "kung fu", 1, true) or string_find(lowerName, "talon", 1, true) or string_find(lowerName, "breath", 1, true) or string_find(lowerName, "human", 1, true) or string_find(lowerName, "art", 1, true) or string_find(lowerName, "electric", 1, true) or string_find(lowerName, "combat", 1, true) or string_find(lowerName, "claw", 1, true) or string_find(lowerName, "leg", 1, true) or string_find(lowerName, "fishman", 1, true) or string_find(lowerName, "melee", 1, true) then
        return true
    end
    return false
end

-- Helper to identify if a tool/name is a Sword
local function isSwordItem(name, toolType)
    if toolType == "Sword" then return true end
    local lowerName = (name or ""):lower()
    return string_find(lowerName, "sword", 1, true)
        or string_find(lowerName, "katana", 1, true)
        or string_find(lowerName, "blade", 1, true)
        or string_find(lowerName, "scythe", 1, true)
        or string_find(lowerName, "trident", 1, true)
        or string_find(lowerName, "saber", 1, true)
        or string_find(lowerName, "anchor", 1, true)
        or string_find(lowerName, "yama", 1, true)
        or string_find(lowerName, "tushita", 1, true)
        or string_find(lowerName, "rengoku", 1, true)
        or string_find(lowerName, "canvander", 1, true)
        or string_find(lowerName, "bisento", 1, true)
        or string_find(lowerName, "shisui", 1, true)
        or string_find(lowerName, "wando", 1, true)
        or string_find(lowerName, "saishi", 1, true)
        or string_find(lowerName, "dagger", 1, true)
        or string_find(lowerName, "pole", 1, true)
        or string_find(lowerName, "cane", 1, true)
        or string_find(lowerName, "mace", 1, true)
        or string_find(lowerName, "lamp", 1, true)
        or string_find(lowerName, "cutlass", 1, true)
        or string_find(lowerName, "pipe", 1, true)
        or string_find(lowerName, "yoru", 1, true)
        or string_find(lowerName, "cdk", 1, true)
        or string_find(lowerName, "ttk", 1, true)
end

-- Helper to identify if a tool/name is a Gun
local function isGunItem(name, toolType)
    if toolType == "Gun" then return true end
    local lowerName = (name or ""):lower()
    return string_find(lowerName, "gun", 1, true)
        or string_find(lowerName, "guitar", 1, true)
        or string_find(lowerName, "rifle", 1, true)
        or string_find(lowerName, "revolver", 1, true)
        or string_find(lowerName, "slingshot", 1, true)
        or string_find(lowerName, "bow", 1, true)
        or string_find(lowerName, "kabucha", 1, true)
        or string_find(lowerName, "cannon", 1, true)
        or string_find(lowerName, "flintlock", 1, true)
        or string_find(lowerName, "musket", 1, true)
        or string_find(lowerName, "bazooka", 1, true)
        or string_find(lowerName, "blaster", 1, true)
        or string_find(lowerName, "shotgun", 1, true)
        or string_find(lowerName, "crossbow", 1, true)
end

-- Deduplicate table array entries
local function deduplicateArray(tbl)
    local seen = {}
    local result = {}
    for _, v in ipairs(tbl) do
        if v and not seen[v] then
            seen[v] = true
            table_insert(result, v)
        end
    end
    return result
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
    ["Warrior Helmet"] = true, ["Zebra Cap"] = true, ["Bandanna"] = true,
    ["Holiday Cape"] = true, ["Cupid Coat"] = true, ["Elf Hat"] = true, ["Santa Hat"] = true,
    ["Green Bandanna"] = true, ["Red Bandanna"] = true, ["Black Bandanna"] = true,
    ["Banana"] = true, ["Bandana"] = true, ["Green Bandana"] = true, ["Red Bandana"] = true, ["Black Bandana"] = true
}

local function isBFAccessory(itemOrName)
    local name = type(itemOrName) == "string" and itemOrName or (itemOrName and itemOrName.Name)
    if not name then return false end
    if bfAccessories[name] then return true end

    if typeof(itemOrName) == "Instance" and itemOrName:IsA("Accessory") then
        local lowerName = name:lower()
        if not string_find(lowerName, "hair", 1, true) and not string_find(lowerName, "roblox", 1, true) and not string_find(lowerName, "shirt", 1, true) and not string_find(lowerName, "pants", 1, true) then
            return true
        end
    end

    for k, _ in pairs(bfAccessories) do
        if string_find(name, k, 1, true) then return true end
    end
    return false
end

-- Scan Character Inventory, Backpack, and Equipment details safely
local function scanInventory(skipRemotes)
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
            local name = item.Name
            local toolTip = ""
            pcall(function() toolTip = item.ToolTip end)
            local toolType = item:GetAttribute("Type") or toolTip or ""
            
            if toolType == "Blox Fruit" or string_find(name, "Fruit", 1, true) then
                table_insert(inventory.fruits, name)
            elseif isSwordItem(name, toolType) then
                table_insert(inventory.swords, name)
            elseif isGunItem(name, toolType) then
                table_insert(inventory.guns, name)
            elseif toolType == "Melee" or isFightingStyle(item) then
                table_insert(inventory.styles, name)
            end
        elseif item:IsA("Accessory") then
            if isBFAccessory(item) then
                table_insert(inventory.accessories, item.Name)
            end
        end
    end

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

    -- Non-interfering remote scanning (Only when explicitly enabled)
    if env.OceanForgeEnableRemotes == true and not skipRemotes then
        local ReplicatedStorage = cloneref(game:GetService("ReplicatedStorage"))
        local CommF = ReplicatedStorage:FindFirstChild("Remotes") and ReplicatedStorage.Remotes:FindFirstChild("CommF_")
        
        if CommF then
            local success, items = pcall(function()
                return CommF:InvokeServer("getInventory")
            end)
            if success and type(items) == "table" then
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
                        elseif itemType == "Melee" or itemType == "Style" or FIGHTING_STYLES[item.Name] or isFightingStyle(item) then
                            table_insert(inventory.styles, item.Name)
                        end
                    end
                end
            end

            task.wait(0.05)

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
    end

    local backpack = LocalPlayer:FindFirstChild("Backpack")
    if backpack then
        for _, item in ipairs(backpack:GetChildren()) do
            parseItem(item)
        end
    end
    
    local char = LocalPlayer.Character
    if char then
        for _, item in ipairs(char:GetChildren()) do
            parseItem(item)
        end
    end

    local equippedStyle = getEquippedFightingStyle()
    if equippedStyle then
        table_insert(inventory.styles, equippedStyle)
    end

    inventory.fruits = deduplicateArray(inventory.fruits)
    inventory.swords = deduplicateArray(inventory.swords)
    inventory.guns = deduplicateArray(inventory.guns)
    inventory.styles = deduplicateArray(inventory.styles)
    inventory.accessories = deduplicateArray(inventory.accessories)

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
            local toolTip = ""
            pcall(function() toolTip = item.ToolTip end)
            local toolType = item:GetAttribute("Type") or toolTip or ""
            
            if toolType == "Blox Fruit" or string_find(name, "Fruit", 1, true) then
                details.fruit = name
            elseif toolType == "Sword" or string_find(name, "Katana", 1, true) or string_find(name, "Blade", 1, true) or string_find(name, "Scythe", 1, true) or string_find(name, "Trident", 1, true) or string_find(name, "Saber", 1, true) or string_find(name, "Anchor", 1, true) or string_find(name, "Yama", 1, true) or string_find(name, "Tushita", 1, true) or string_find(name, "Rengoku", 1, true) or string_find(name, "Canvander", 1, true) or string_find(name, "Bisento", 1, true) or string_find(name, "Shisui", 1, true) or string_find(name, "Wando", 1, true) or string_find(name, "Saishi", 1, true) or string_find(name, "Dagger", 1, true) or string_find(name, "Pole", 1, true) then
                details.sword = name
            elseif toolType == "Gun" or string_find(name, "Guitar", 1, true) or string_find(name, "Rifle", 1, true) or string_find(name, "Revolver", 1, true) or string_find(name, "Slingshot", 1, true) or string_find(name, "Bow", 1, true) or string_find(name, "Kabucha", 1, true) or string_find(name, "Cannon", 1, true) or string_find(name, "Flintlock", 1, true) or string_find(name, "Musket", 1, true) then
                details.gun = name
            elseif toolType == "Melee" or isFightingStyle(item) then
                details.fightingStyle = name
            end
        end
    end

    local char = LocalPlayer.Character
    local equippedAccessories = {}
    if char then
        for _, item in ipairs(char:GetChildren()) do
            if item:IsA("Accessory") then
                if isBFAccessory(item) then
                    table_insert(equippedAccessories, item.Name)
                end
            else
                checkItem(item)
            end
        end
    end

    if #equippedAccessories > 0 then
        equippedAccessories = deduplicateArray(equippedAccessories)
        details.accessory = table.concat(equippedAccessories, ", ")
    end

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

-- Identify Device ID, Android ID, and Platform
local function getDeviceIdentifier()
    local hwid = nil
    local executorName = "Roblox Client"
    
    -- 1. Exhaustive Executor Name Scan
    pcall(function()
        if identifyexecutor then
            local name, ver = identifyexecutor()
            if name and tostring(name) ~= "" then
                executorName = tostring(name) .. (ver and (" " .. tostring(ver)) or "")
            end
        elseif getexecutorname then
            local name = getexecutorname()
            if name and tostring(name) ~= "" then executorName = tostring(name) end
        elseif identify_executor then
            local name, ver = identify_executor()
            if name and tostring(name) ~= "" then executorName = tostring(name) .. (ver and (" " .. tostring(ver)) or "") end
        elseif get_executor_name then
            local name = get_executor_name()
            if name and tostring(name) ~= "" then executorName = tostring(name) end
        end
    end)
    
    -- Heuristic Executor detection if standard API is blocked
    if executorName == "Roblox Client" then
        pcall(function()
            local g = getgenv and getgenv() or _G
            if _G.DELTA or (g and g.DELTA) or (env and env.DELTA) then
                executorName = "Delta"
            elseif _G.CODEX or (g and g.CODEX) or (env and env.CODEX) then
                executorName = "Codex"
            elseif _G.ARCEUS or (g and g.ARCEUS) or (env and env.ARCEUS) then
                executorName = "Arceus X"
            elseif _G.FLUXUS or fluxus or is_fluxus_closure then
                executorName = "Fluxus"
            elseif _G.HYDROGEN or (g and g.HYDROGEN) then
                executorName = "Hydrogen"
            elseif _G.SOLARA or (g and g.SOLARA) or is_solara then
                executorName = "Solara"
            elseif _G.WAVE or (g and g.WAVE) then
                executorName = "Wave"
            elseif _G.VEGA or (g and g.VEGA) then
                executorName = "Vega X"
            elseif _G.CELERY or (g and g.CELERY) then
                executorName = "Celery"
            elseif KRNL_LOADED then
                executorName = "Krnl"
            elseif syn then
                executorName = "Synapse"
            end
        end)
    end
    
    -- 2. Exhaustive HWID & SameHwid Detection
    pcall(function()
        local g = getgenv and getgenv() or _G
        if _G.SameHwid and tostring(_G.SameHwid) ~= "" then
            hwid = tostring(_G.SameHwid)
        elseif _G.CustomHWID and tostring(_G.CustomHWID) ~= "" then
            hwid = tostring(_G.CustomHWID)
        elseif _G.HWID and tostring(_G.HWID) ~= "" then
            hwid = tostring(_G.HWID)
        elseif _G.AndroidID and tostring(_G.AndroidID) ~= "" then
            hwid = tostring(_G.AndroidID)
        elseif env.SameHwid and tostring(env.SameHwid) ~= "" then
            hwid = tostring(env.SameHwid)
        elseif env.CustomHWID and tostring(env.CustomHWID) ~= "" then
            hwid = tostring(env.CustomHWID)
        elseif g and g.SameHwid and tostring(g.SameHwid) ~= "" then
            hwid = tostring(g.SameHwid)
        elseif g and g.CustomHWID and tostring(g.CustomHWID) ~= "" then
            hwid = tostring(g.CustomHWID)
        elseif g and g.HWID and tostring(g.HWID) ~= "" then
            hwid = tostring(g.HWID)
        elseif gethwid then
            hwid = tostring(gethwid())
        elseif get_hwid then
            hwid = tostring(get_hwid())
        elseif env.gethwid then
            hwid = tostring(env.gethwid())
        elseif g and g.gethwid then
            hwid = tostring(g.gethwid())
        elseif get_device_id then
            hwid = tostring(get_device_id())
        elseif getdeviceid then
            hwid = tostring(getdeviceid())
        end
    end)
    
    if not hwid or hwid == "" then
        pcall(function()
            local rbxAnalytics = (cloneref and cloneref(game:GetService("RbxAnalyticsService"))) or game:GetService("RbxAnalyticsService")
            if rbxAnalytics and rbxAnalytics.GetClientId then
                hwid = tostring(rbxAnalytics:GetClientId())
            end
        end)
    end
    
    -- Fallback Device ID based on UserId
    if not hwid or hwid == "" then
        hwid = "DEV_" .. string.sub(tostring(LocalPlayer.UserId * 2654435761), 1, 12)
    end
    
    local platformName = "Roblox Client"
    pcall(function()
        local platform = UserInputService:GetPlatform()
        if platform == Enum.Platform.Android then
            platformName = "Android"
        elseif platform == Enum.Platform.Windows then
            platformName = "Windows"
        elseif platform == Enum.Platform.IOS then
            platformName = "iOS"
        elseif platform == Enum.Platform.OSX then
            platformName = "macOS"
        end
    end)
    
    local displayHwid = string.gsub(hwid, "[{}]", "")
    local shortHwid = #displayHwid > 14 and (string.sub(displayHwid, 1, 6) .. ".." .. string.sub(displayHwid, -4)) or displayHwid
    
    return {
        deviceId = hwid,
        androidId = hwid,
        hwid = hwid,
        displayHwid = displayHwid,
        shortHwid = shortHwid,
        sameHwid = (_G.SameHwid or _G.CustomHWID or env.SameHwid or (getgenv and getgenv().SameHwid)) and true or false,
        device = platformName .. " (" .. executorName .. " | " .. shortHwid .. ")",
        platform = platformName,
        executor = executorName
    }
end

-- ==========================================================
-- ACTIVE HUB / AUTO-FARM SCRIPT DETECTOR (BANANA, MARU, ETC.)
-- ==========================================================
local function detectActiveHub()
    local detectedHubs = {}
    
    -- 1. Check Global Environment Tables (_G, getgenv, shared)
    local function checkTable(tbl)
        if not tbl then return end
        for k, _ in pairs(tbl) do
            local strKey = tostring(k):lower()
            if string.find(strKey, "banana", 1, true) then
                detectedHubs["Banana Hub"] = true
            elseif string.find(strKey, "maru", 1, true) then
                detectedHubs["Maru Hub"] = true
            elseif string.find(strKey, "redz", 1, true) then
                detectedHubs["Redz Hub"] = true
            elseif string.find(strKey, "hoho", 1, true) then
                detectedHubs["Hoho Hub"] = true
            elseif string.find(strKey, "wazure", 1, true) or string.find(strKey, "w_azure", 1, true) or string.find(strKey, "w-azure", 1, true) then
                detectedHubs["W-Azure Hub"] = true
            elseif string.find(strKey, "mukuro", 1, true) then
                detectedHubs["Mukuro Hub"] = true
            elseif string.find(strKey, "speedhub", 1, true) or string.find(strKey, "speed_hub", 1, true) then
                detectedHubs["Speed Hub"] = true
            elseif string.find(strKey, "zenith", 1, true) then
                detectedHubs["Zenith Hub"] = true
            end
        end
    end

    checkTable(_G)
    if getgenv then checkTable(getgenv()) end
    if shared then checkTable(shared) end
    
    -- Direct variable checks for Banana Hub
    if _G.BananaHub or _G.Banana_Settings or _G.BananaLoaded or _G.BANANA_LOADED or (getgenv and (getgenv().BananaHub or getgenv().Banana or getgenv().BananaLoaded or getgenv().Banana_Config or getgenv().Banana_Setting)) then
        detectedHubs["Banana Hub"] = true
    end

    -- Direct variable checks for Maru Hub
    if _G.MaruHub or _G.Maru or _G.MaruLoaded or _G.MARU_LOADED or (getgenv and (getgenv().MaruHub or getgenv().Maru or getgenv().MaruLoaded or getgenv().Maru_Settings or getgenv().MaruUI)) then
        detectedHubs["Maru Hub"] = true
    end

    -- 2. CoreGui, PlayerGui, and gethui UI Scanner
    local function scanGuis(parent)
        if not parent then return end
        for _, child in ipairs(parent:GetChildren()) do
            local name = child.Name:lower()
            if string.find(name, "banana", 1, true) then
                detectedHubs["Banana Hub"] = true
            elseif string.find(name, "maru", 1, true) then
                detectedHubs["Maru Hub"] = true
            elseif string.find(name, "redz", 1, true) then
                detectedHubs["Redz Hub"] = true
            elseif string.find(name, "hoho", 1, true) then
                detectedHubs["Hoho Hub"] = true
            elseif string.find(name, "wazure", 1, true) or string.find(name, "w-azure", 1, true) then
                detectedHubs["W-Azure Hub"] = true
            end

            pcall(function()
                for _, desc in ipairs(child:GetDescendants()) do
                    if desc:IsA("TextLabel") or desc:IsA("TextButton") then
                        local text = (desc.Text or ""):lower()
                        if string.find(text, "banana hub", 1, true) or string.find(text, "banana free", 1, true) or string.find(text, "bananahub", 1, true) then
                            detectedHubs["Banana Hub"] = true
                        elseif string.find(text, "maru hub", 1, true) or string.find(text, "maruhub", 1, true) or string.find(text, "maru v", 1, true) then
                            detectedHubs["Maru Hub"] = true
                        end
                    end
                end
            end)
        end
    end

    local successCore, coreGui = pcall(function() return cloneref(game:GetService("CoreGui")) end)
    if successCore and coreGui then scanGuis(coreGui) end
    
    if LocalPlayer and LocalPlayer:FindFirstChild("PlayerGui") then
        scanGuis(LocalPlayer.PlayerGui)
    end
    
    if gethui and type(gethui) == "function" then
        pcall(function()
            local hiddenGui = gethui()
            if hiddenGui then scanGuis(hiddenGui) end
        end)
    end

    -- 3. File System Signature Check (Banana/Maru configs)
    if isfolder then
        pcall(function()
            if isfolder("BananaHub") or isfolder("Banana") or (isfile and (isfile("banana_setting.json") or isfile("Banana_Config.json"))) then
                detectedHubs["Banana Hub"] = true
            end
            if isfolder("MaruHub") or isfolder("Maru") or (isfile and (isfile("Maru_Config.json") or isfile("maruhub_config.json") or isfile("Maru/Config.json"))) then
                detectedHubs["Maru Hub"] = true
            end
        end)
    end

    local hubList = {}
    for hub, _ in pairs(detectedHubs) do
        table.insert(hubList, hub)
    end

    if #hubList == 0 then
        return "None / Custom Script"
    end
    return table.concat(hubList, ", ")
end

-- ==========================================================
-- NEOVIM LSP-INSPIRED CYBER TOKYO NIGHT GUI DESIGN (v2.6)
-- ==========================================================

local isMinimized = false
local pulseTween = nil

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "OceanForgeNeovimLsp_" .. tostring(math.random(100000, 999999))
ScreenGui.ResetOnSpawn = false

local gethui = gethui or (syn and syn.protect_gui and function(gui) syn.protect_gui(gui) return cloneref(game:GetService("CoreGui")) end) or nil
local parented = false

if gethui and type(gethui) == "function" then
    pcall(function()
        local hiddenContainer = gethui(ScreenGui)
        if hiddenContainer then
            ScreenGui.Parent = hiddenContainer
            parented = true
        end
    end)
end

if not parented then
    local successCore, coreGui = pcall(function() return cloneref(game:GetService("CoreGui")) end)
    if successCore and coreGui then
        ScreenGui.Parent = coreGui
    else
        ScreenGui.Parent = LocalPlayer:WaitForChild("PlayerGui")
    end
end

-- Main Floating Buffer Frame (Tokyo Night Obsidian Glass)
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 440, 0, 240)
MainFrame.Position = UDim2.new(0.5, -220, 0.4, -120)
MainFrame.BackgroundColor3 = Color3.fromRGB(15, 20, 32) -- Tokyo Night Dark Navy
MainFrame.BackgroundTransparency = 0.05
MainFrame.BorderSizePixel = 0
MainFrame.Active = true
MainFrame.Draggable = true
MainFrame.Parent = ScreenGui

local MainGradient = Instance.new("UIGradient")
MainGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(18, 24, 38)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(15, 20, 32)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(24, 18, 36))
}
MainGradient.Rotation = 45
MainGradient.Parent = MainFrame

local MainCorner = Instance.new("UICorner")
MainCorner.CornerRadius = UDim.new(0, 12)
MainCorner.Parent = MainFrame

-- Glowing Neon Cyan & Violet Dual-Tone Stroke Border
local MainStroke = Instance.new("UIStroke")
MainStroke.Thickness = 1.6
MainStroke.Color = Color3.fromRGB(56, 189, 248)
MainStroke.Parent = MainFrame

local StrokeGradient = Instance.new("UIGradient")
StrokeGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(56, 189, 248)),   -- Cyan Neon
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(129, 140, 248)), -- Indigo Neon
    ColorSequenceKeypoint.new(1, Color3.fromRGB(232, 121, 249))   -- Fuchsia Neon
}
StrokeGradient.Rotation = 135
StrokeGradient.Parent = MainStroke

-- Topbar (Neovim Lualine / Tabline Header)
local Topbar = Instance.new("Frame")
Topbar.Name = "Topbar"
Topbar.Size = UDim2.new(1, 0, 0, 38)
Topbar.BackgroundTransparency = 1
Topbar.Parent = MainFrame

-- Vim Mode Pill (NORMAL / LSP)
local ModePill = Instance.new("TextLabel")
ModePill.Size = UDim2.new(0, 68, 0, 20)
ModePill.Position = UDim2.new(0.03, 0, 0.24, 0)
ModePill.BackgroundColor3 = Color3.fromRGB(56, 189, 248)
ModePill.Text = "NORMAL"
ModePill.TextColor3 = Color3.fromRGB(15, 23, 42)
ModePill.Font = Enum.Font.GothamBold
ModePill.TextSize = 10
ModePill.Parent = Topbar

local ModeCorner = Instance.new("UICorner")
ModeCorner.CornerRadius = UDim.new(0, 5)
ModeCorner.Parent = ModePill

local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Size = UDim2.new(0.55, 0, 1, 0)
Title.Position = UDim2.new(0.20, 0, 0, 0)
Title.BackgroundTransparency = 1
Title.Text = "⚡ OCEANFORGE // LSP TELEMETRY"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 12.5
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = Topbar

-- Version Tag
local VersionBadge = Instance.new("TextLabel")
VersionBadge.Size = UDim2.new(0, 48, 0, 18)
VersionBadge.Position = UDim2.new(0.74, 0, 0.26, 0)
VersionBadge.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
VersionBadge.Text = "v2.6 LSP"
VersionBadge.TextColor3 = Color3.fromRGB(148, 163, 184)
VersionBadge.Font = Enum.Font.GothamBold
VersionBadge.TextSize = 9
VersionBadge.Parent = Topbar

local VersionCorner = Instance.new("UICorner")
VersionCorner.CornerRadius = UDim.new(0, 5)
VersionCorner.Parent = VersionBadge

-- Minimize Button
local MinBtn = Instance.new("TextButton")
MinBtn.Name = "MinBtn"
MinBtn.Size = UDim2.new(0, 26, 0, 26)
MinBtn.Position = UDim2.new(0.92, -10, 0.5, -13)
MinBtn.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
MinBtn.Text = "−"
MinBtn.TextColor3 = Color3.fromRGB(56, 189, 248)
MinBtn.Font = Enum.Font.GothamBold
MinBtn.TextSize = 15
MinBtn.Parent = Topbar

local MinCorner = Instance.new("UICorner")
MinCorner.CornerRadius = UDim.new(0, 6)
MinCorner.Parent = MinBtn

local MinStroke = Instance.new("UIStroke")
MinStroke.Thickness = 1
MinStroke.Color = Color3.fromRGB(56, 189, 248)
MinStroke.Parent = MinBtn

local TopDivider = Instance.new("Frame")
TopDivider.Size = UDim2.new(0.94, 0, 0, 1)
TopDivider.Position = UDim2.new(0.03, 0, 1, 0)
TopDivider.BackgroundColor3 = Color3.fromRGB(51, 65, 85)
TopDivider.BorderSizePixel = 0
TopDivider.Parent = Topbar

-- Floating Anchor Button when Minimized
local AnchorBtn = Instance.new("TextButton")
AnchorBtn.Name = "AnchorBtn"
AnchorBtn.Size = UDim2.new(0, 46, 0, 46)
AnchorBtn.Position = UDim2.new(0.95, -46, 0.85, -46)
AnchorBtn.BackgroundColor3 = Color3.fromRGB(15, 23, 42)
AnchorBtn.TextColor3 = Color3.fromRGB(56, 189, 248)
AnchorBtn.Text = "⚡"
AnchorBtn.Font = Enum.Font.GothamBold
AnchorBtn.TextSize = 20
AnchorBtn.Visible = false
AnchorBtn.Parent = ScreenGui

local AnchorCorner = Instance.new("UICorner")
AnchorCorner.CornerRadius = UDim.new(0, 23)
AnchorCorner.Parent = AnchorBtn

local AnchorStroke = Instance.new("UIStroke")
AnchorStroke.Thickness = 1.6
AnchorStroke.Color = Color3.fromRGB(56, 189, 248)
AnchorStroke.Parent = AnchorBtn

-- Monitor Screen Body
local MonitorScreen = Instance.new("Frame")
MonitorScreen.Name = "MonitorScreen"
MonitorScreen.Size = UDim2.new(1, 0, 0.82, 0)
MonitorScreen.Position = UDim2.new(0, 0, 0.18, 0)
MonitorScreen.BackgroundTransparency = 1
MonitorScreen.Visible = true
MonitorScreen.Parent = MainFrame

-- Status Bar Row (LSP Statusline / Diagnostics)
local StatusRow = Instance.new("Frame")
StatusRow.Size = UDim2.new(0.94, 0, 0, 20)
StatusRow.Position = UDim2.new(0.03, 0, 0.04, 0)
StatusRow.BackgroundTransparency = 1
StatusRow.Parent = MonitorScreen

local LedIndicator = Instance.new("Frame")
LedIndicator.Name = "LedIndicator"
LedIndicator.Size = UDim2.new(0, 8, 0, 8)
LedIndicator.Position = UDim2.new(0, 0, 0.5, -4)
LedIndicator.BackgroundColor3 = Color3.fromRGB(74, 222, 128)
LedIndicator.BorderSizePixel = 0
LedIndicator.Parent = StatusRow

local LedCorner = Instance.new("UICorner")
LedCorner.CornerRadius = UDim.new(0, 4)
LedCorner.Parent = LedIndicator

local LedLabel = Instance.new("TextLabel")
LedLabel.Size = UDim2.new(0.95, -12, 1, 0)
LedLabel.Position = UDim2.new(0, 14, 0, 0)
LedLabel.BackgroundTransparency = 1
LedLabel.Text = "LSP: CONNECTED | C# ENGINE: 0.04ms | 🛡️ ANTI-BAN: ON"
LedLabel.TextColor3 = Color3.fromRGB(148, 163, 184)
LedLabel.Font = Enum.Font.GothamBold
LedLabel.TextSize = 9.5
LedLabel.TextXAlignment = Enum.TextXAlignment.Left
LedLabel.Parent = StatusRow

-- 2-Column Split Window Buffer (Neovim Vsplit Layout)
local CardContainer = Instance.new("Frame")
CardContainer.Size = UDim2.new(0.94, 0, 0.78, 0)
CardContainer.Position = UDim2.new(0.03, 0, 0.18, 0)
CardContainer.BackgroundTransparency = 1
CardContainer.Parent = MonitorScreen

-- Buffer 1 (Left): Player Profile, Devil Fruit & Location
local Card1 = Instance.new("Frame")
Card1.Size = UDim2.new(0.485, 0, 1, 0)
Card1.Position = UDim2.new(0, 0, 0, 0)
Card1.BackgroundColor3 = Color3.fromRGB(20, 27, 44)
Card1.BackgroundTransparency = 0.3
Card1.BorderSizePixel = 0
Card1.Parent = CardContainer

local Card1Corner = Instance.new("UICorner")
Card1Corner.CornerRadius = UDim.new(0, 8)
Card1Corner.Parent = Card1

local Card1Stroke = Instance.new("UIStroke")
Card1Stroke.Thickness = 1
Card1Stroke.Color = Color3.fromRGB(51, 65, 85)
Card1Stroke.Parent = Card1

local Card1Title = Instance.new("TextLabel")
Card1Title.Size = UDim2.new(0.9, 0, 0, 18)
Card1Title.Position = UDim2.new(0.06, 0, 0.06, 0)
Card1Title.BackgroundTransparency = 1
Card1Title.Text = "󰅂 BUFFER: CLIENT PROFILE"
Card1Title.TextColor3 = Color3.fromRGB(56, 189, 248)
Card1Title.Font = Enum.Font.GothamBold
Card1Title.TextSize = 9.5
Card1Title.TextXAlignment = Enum.TextXAlignment.Left
Card1Title.Parent = Card1

local UsernameLabel = Instance.new("TextLabel")
UsernameLabel.Size = UDim2.new(0.9, 0, 0, 20)
UsernameLabel.Position = UDim2.new(0.06, 0, 0.22, 0)
UsernameLabel.BackgroundTransparency = 1
UsernameLabel.Text = "👤 " .. LocalPlayer.Name
UsernameLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
UsernameLabel.Font = Enum.Font.GothamSemibold
UsernameLabel.TextSize = 11
UsernameLabel.TextXAlignment = Enum.TextXAlignment.Left
UsernameLabel.Parent = Card1

local IslandLabel = Instance.new("TextLabel")
IslandLabel.Size = UDim2.new(0.9, 0, 0, 20)
IslandLabel.Position = UDim2.new(0.06, 0, 0.42, 0)
IslandLabel.BackgroundTransparency = 1
IslandLabel.Text = "🗺️ Scanning Location..."
IslandLabel.TextColor3 = Color3.fromRGB(203, 213, 225)
IslandLabel.Font = Enum.Font.GothamMedium
IslandLabel.TextSize = 10.5
IslandLabel.TextXAlignment = Enum.TextXAlignment.Left
IslandLabel.Parent = Card1

local FruitLabel = Instance.new("TextLabel")
FruitLabel.Size = UDim2.new(0.9, 0, 0, 20)
FruitLabel.Position = UDim2.new(0.06, 0, 0.62, 0)
FruitLabel.BackgroundTransparency = 1
FruitLabel.Text = "🍇 Fruit: Scanning..."
FruitLabel.TextColor3 = Color3.fromRGB(232, 121, 249) -- Fuchsia
FruitLabel.Font = Enum.Font.GothamMedium
FruitLabel.TextSize = 10.5
FruitLabel.TextXAlignment = Enum.TextXAlignment.Left
FruitLabel.Parent = Card1

local HubBadge = Instance.new("TextLabel")
HubBadge.Size = UDim2.new(0.9, 0, 0, 20)
HubBadge.Position = UDim2.new(0.06, 0, 0.80, 0)
HubBadge.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
HubBadge.Text = "🤖 Hub: Detecting..."
HubBadge.TextColor3 = Color3.fromRGB(250, 204, 21) -- Gold
HubBadge.Font = Enum.Font.GothamBold
HubBadge.TextSize = 9.5
HubBadge.TextXAlignment = Enum.TextXAlignment.Left
HubBadge.Parent = Card1

local HubCorner = Instance.new("UICorner")
HubCorner.CornerRadius = UDim.new(0, 4)
HubCorner.Parent = HubBadge

-- Buffer 2 (Right): Level Progress & Wealth Stats
local Card2 = Instance.new("Frame")
Card2.Size = UDim2.new(0.485, 0, 1, 0)
Card2.Position = UDim2.new(0.515, 0, 0, 0)
Card2.BackgroundColor3 = Color3.fromRGB(20, 27, 44)
Card2.BackgroundTransparency = 0.3
Card2.BorderSizePixel = 0
Card2.Parent = CardContainer

local Card2Corner = Instance.new("UICorner")
Card2Corner.CornerRadius = UDim.new(0, 8)
Card2Corner.Parent = Card2

local Card2Stroke = Instance.new("UIStroke")
Card2Stroke.Thickness = 1
Card2Stroke.Color = Color3.fromRGB(51, 65, 85)
Card2Stroke.Parent = Card2

local Card2Title = Instance.new("TextLabel")
Card2Title.Size = UDim2.new(0.9, 0, 0, 18)
Card2Title.Position = UDim2.new(0.06, 0, 0.06, 0)
Card2Title.BackgroundTransparency = 1
Card2Title.Text = "󰅂 BUFFER: STATS & PROGRESS"
Card2Title.TextColor3 = Color3.fromRGB(129, 140, 248)
Card2Title.Font = Enum.Font.GothamBold
Card2Title.TextSize = 9.5
Card2Title.TextXAlignment = Enum.TextXAlignment.Left
Card2Title.Parent = Card2

local LevelLabel = Instance.new("TextLabel")
LevelLabel.Size = UDim2.new(0.9, 0, 0, 20)
LevelLabel.Position = UDim2.new(0.06, 0, 0.22, 0)
LevelLabel.BackgroundTransparency = 1
LevelLabel.Text = "⚔️ Level: -- / 2800"
LevelLabel.TextColor3 = Color3.fromRGB(56, 189, 248)
LevelLabel.Font = Enum.Font.GothamSemibold
LevelLabel.TextSize = 11
LevelLabel.TextXAlignment = Enum.TextXAlignment.Left
LevelLabel.Parent = Card2

-- Level Progress Bar Background
local ProgressBarBg = Instance.new("Frame")
ProgressBarBg.Size = UDim2.new(0.88, 0, 0, 4)
ProgressBarBg.Position = UDim2.new(0.06, 0, 0.38, 0)
ProgressBarBg.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
ProgressBarBg.BorderSizePixel = 0
ProgressBarBg.Parent = Card2

local ProgressCorner = Instance.new("UICorner")
ProgressCorner.CornerRadius = UDim.new(0, 2)
ProgressCorner.Parent = ProgressBarBg

local ProgressBarFill = Instance.new("Frame")
ProgressBarFill.Name = "ProgressBarFill"
ProgressBarFill.Size = UDim2.new(0.5, 0, 1, 0)
ProgressBarFill.BackgroundColor3 = Color3.fromRGB(56, 189, 248)
ProgressBarFill.BorderSizePixel = 0
ProgressBarFill.Parent = ProgressBarBg

local FillCorner = Instance.new("UICorner")
FillCorner.CornerRadius = UDim.new(0, 2)
FillCorner.Parent = ProgressBarFill

local BeliLabel = Instance.new("TextLabel")
BeliLabel.Size = UDim2.new(0.9, 0, 0, 20)
BeliLabel.Position = UDim2.new(0.06, 0, 0.48, 0)
BeliLabel.BackgroundTransparency = 1
BeliLabel.Text = "💰 Beli: $0"
BeliLabel.TextColor3 = Color3.fromRGB(250, 204, 21)
BeliLabel.Font = Enum.Font.GothamSemibold
BeliLabel.TextSize = 11
BeliLabel.TextXAlignment = Enum.TextXAlignment.Left
BeliLabel.Parent = Card2

local FragLabel = Instance.new("TextLabel")
FragLabel.Size = UDim2.new(0.9, 0, 0, 20)
FragLabel.Position = UDim2.new(0.06, 0, 0.66, 0)
FragLabel.BackgroundTransparency = 1
FragLabel.Text = "💎 Fragments: 0"
FragLabel.TextColor3 = Color3.fromRGB(192, 132, 252)
FragLabel.Font = Enum.Font.GothamSemibold
FragLabel.TextSize = 11
FragLabel.TextXAlignment = Enum.TextXAlignment.Left
FragLabel.Parent = Card2

local HwidBadge = Instance.new("TextButton")
HwidBadge.Size = UDim2.new(0.9, 0, 0, 20)
HwidBadge.Position = UDim2.new(0.06, 0, 0.80, 0)
HwidBadge.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
HwidBadge.Text = "📱 HWID: Scanning..."
HwidBadge.TextColor3 = Color3.fromRGB(129, 140, 248)
HwidBadge.Font = Enum.Font.GothamBold
HwidBadge.TextSize = 9.5
HwidBadge.TextXAlignment = Enum.TextXAlignment.Left
HwidBadge.AutoButtonColor = true
HwidBadge.Parent = Card2

local HwidCorner = Instance.new("UICorner")
HwidCorner.CornerRadius = UDim.new(0, 4)
HwidCorner.Parent = HwidBadge

-- 1-Click Copy Full HWID to Clipboard
HwidBadge.MouseButton1Click:Connect(function()
    local dev = getDeviceIdentifier()
    local fullHwid = dev and dev.hwid or ""
    if fullHwid ~= "" then
        pcall(function()
            if setclipboard then
                setclipboard(tostring(fullHwid))
            elseif toclipboard then
                toclipboard(tostring(fullHwid))
            elseif set_clipboard then
                set_clipboard(tostring(fullHwid))
            end
        end)
        local origText = HwidBadge.Text
        HwidBadge.Text = "📋 Đã Copy HWID vào Clipboard!"
        HwidBadge.TextColor3 = Color3.fromRGB(74, 222, 128)
        task.delay(1.5, function()
            HwidBadge.Text = origText
        end)
    end
end)

-- Minimize & Restore Interactions
MinBtn.MouseButton1Click:Connect(function()
    isMinimized = true
    MainFrame.Visible = false
    AnchorBtn.Visible = true
end)

AnchorBtn.MouseButton1Click:Connect(function()
    isMinimized = false
    MainFrame.Visible = true
    AnchorBtn.Visible = false
end)

local function formatComma(amount)
    local formatted = tostring(amount)
    local k
    repeat
        formatted, k = string.gsub(formatted, "^(-?%d+)(%d%d%d)", "%1,%2")
    until k == 0
    return formatted
end

-- ==========================================================
-- C# FAST ACCELERATION & FNV-1a CHECKSUM DEDUPLICATION ENGINE
-- ==========================================================
local function computeFnv1aChecksum(str)
    if not str then return "00000000" end
    local hash = 2166136261
    local bitXor = (bit32 and bit32.bxor) or (bit and bit.bxor)
    for i = 1, #str do
        local byte = string.byte(str, i)
        if bitXor then
            local ok, res = pcall(bitXor, hash, byte)
            if ok and res then hash = res else hash = (hash + byte) end
        else
            hash = (hash + byte)
        end
        hash = (hash * 16777619) % 4294967296
    end
    return string.format("%08x", hash)
end

local lastPayloadHash = ""
local lastPayloadTime = 0
local lastSendTime = 0

-- Main Ingestion Sync Function with Connection Alerts
local function sendStats()
    if not isInstanceValid() then return end
    lastSendTime = tick()
    local dataFolder = LocalPlayer:FindFirstChild("Data") or LocalPlayer:FindFirstChild("Leaderstats") or LocalPlayer:FindFirstChild("leaderstats")

    local level = (dataFolder and dataFolder:FindFirstChild("Level")) and dataFolder.Level.Value or 1
    local beli = (dataFolder and dataFolder:FindFirstChild("Beli")) and dataFolder.Beli.Value or 0
    local fragments = (dataFolder and dataFolder:FindFirstChild("Fragments")) and dataFolder.Fragments.Value or 0
    
    local inventory = scanInventory()
    local equipped = getEquippedDetails(inventory)
    
    local deviceInfo = getDeviceIdentifier()
    local activeHub = detectActiveHub()

    UsernameLabel.Text = "👤 " .. LocalPlayer.Name
    IslandLabel.Text = "🗺️ " .. getIslandName() .. " (Sea " .. getSea() .. ")"
    LevelLabel.Text = "⚔️ Level: " .. formatComma(level) .. " / 2800"
    BeliLabel.Text = "💰 Beli: $" .. formatComma(beli)
    FragLabel.Text = "💎 Fragments: " .. formatComma(fragments)

    if deviceInfo then
        local shortId = tostring(deviceInfo.shortHwid or deviceInfo.hwid or "Unknown")
        HwidBadge.Text = "📱 " .. tostring(deviceInfo.executor or "Client") .. " | " .. shortId
        if deviceInfo.sameHwid then
            HwidBadge.TextColor3 = Color3.fromRGB(52, 211, 153)
        else
            HwidBadge.TextColor3 = Color3.fromRGB(129, 140, 248)
        end
    end

    -- Update Neovim Progress Bar & Buffer Badges
    local pct = math.clamp(level / 2800, 0, 1)
    ProgressBarFill.Size = UDim2.new(pct, 0, 1, 0)

    local fruitName = (equipped and equipped.fruit and equipped.fruit.name) or "None"
    FruitLabel.Text = "🍇 " .. tostring(fruitName)

    if activeHub and activeHub ~= "None / Custom Script" then
        HubBadge.Text = "🤖 " .. tostring(activeHub)
        if string.find(activeHub:lower(), "banana", 1, true) then
            HubBadge.TextColor3 = Color3.fromRGB(250, 204, 21)
        elseif string.find(activeHub:lower(), "maru", 1, true) then
            HubBadge.TextColor3 = Color3.fromRGB(56, 189, 248)
        else
            HubBadge.TextColor3 = Color3.fromRGB(74, 222, 128)
        end
    else
        HubBadge.Text = "🤖 Custom Script"
        HubBadge.TextColor3 = Color3.fromRGB(148, 163, 184)
    end

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
                    if enemy:GetAttribute("IsBoss") or string.find(enemy.Name, "Boss", 1, true) or enemyHumanoid.MaxHealth > 500000 then
                        status = "bossing"
                    else
                        status = "grinding"
                    end
                    break
                end
            end
        end
    end

    local apiKey = env.OceanForgeApiKey or _G.OceanForgeApiKey or ""
    if (apiKey == "" or apiKey == "YOUR_API_KEY_HERE") and loadSavedKey then
        local keyFromFile = loadSavedKey()
        if keyFromFile and keyFromFile ~= "" then
            apiKey = keyFromFile
            env.OceanForgeApiKey = keyFromFile
            _G.OceanForgeApiKey = keyFromFile
        end
    end

    local payload = {
        apiKey = apiKey,
        username = LocalPlayer.Name,
        robloxUsername = LocalPlayer.Name,
        deviceId = deviceInfo.deviceId,
        androidId = deviceInfo.androidId,
        hwid = deviceInfo.hwid,
        sameHwid = deviceInfo.sameHwid,
        activeHub = activeHub,
        currentHub = activeHub,
        level = level,
        beli = beli,
        fragments = fragments,
        race = getRace(),
        sea = getSea(),
        fruit = equipped.fruit,
        fruit_equipped = equipped.fruit,
        fruit_mastery = equipped.fruitMastery,
        sword = equipped.sword,
        gun = equipped.gun,
        fightingStyle = equipped.fightingStyle,
        fighting_style = equipped.fightingStyle,
        accessory_equipped = equipped.accessory or "None",
        status = status,
        location = getIslandName(),
        playtime = math.floor(workspace.DistributedGameTime),
        device = deviceInfo.device,
        platform = deviceInfo.platform,
        executor = deviceInfo.executor,
        csharpAccelerated = true,
        inventory = inventory
    }

    local rawHashStr = tostring(LocalPlayer.Name) .. "|" .. tostring(level) .. "|" .. tostring(beli) .. "|" .. tostring(fragments) .. "|" .. tostring(status) .. "|" .. tostring(payload.location) .. "|" .. tostring(equipped.fruit) .. "|" .. tostring(equipped.sword)
    local currentFnvHash = computeFnv1aChecksum(rawHashStr)
    local isStateUnchanged = (currentFnvHash == lastPayloadHash) and (tick() - lastPayloadTime < 60)

    local success, jsonPayload = pcall(function()
        return HttpService:JSONEncode(payload)
    end)

    if not success then
        warn("OceanForge C# Engine: Failed to serialize data payload.")
        return
    end

    if not requestLib then
        warn("OceanForge C# Engine: HTTP request executor function not found!")
        if lastConnectionStatus ~= false then
            lastConnectionStatus = false
            sendNotification("🔴 KẾT NỐI THẤT BẠI", "Executor của bạn không hỗ trợ hàm gửi HTTP Request!", 7)
        end
        return
    end

    task.spawn(function()
        local rawServerUrl = env.OceanForgeCSharpBridgeUrl or _G.OceanForgeCSharpBridgeUrl or env.OceanForgeServerUrl or _G.OceanForgeServerUrl or "https://quan-ly-acc-viet-nam.onrender.com"
        local cleanServerUrl = string_gsub(tostring(rawServerUrl), "/+$", "")

        if apiKey == "" or apiKey == "YOUR_API_KEY_HERE" then
            LedIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11)
            LedLabel.Text = "STATUS: THIẾU API KEY ⚠️ | ⚡ C# ENGINE"
            LedLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
            
            if lastConnectionStatus ~= false then
                lastConnectionStatus = false
                sendNotification("⚠️ CHƯA NHẬP API KEY", "Vui lòng copy Roblox Loader Script từ Web Dashboard để tự động nhận Key!", 7)
            end
            return
        end

        local function getStatusCode(res)
            if not res then return 0 end
            if res.Success == true and not res.StatusCode and not res.status and not res.status_code then
                return 200
            end
            local raw = res.StatusCode or res.status_code or res.status or res.Status or res.StatusText or res.StatusMessage
            if type(raw) == "number" then
                return raw
            elseif type(raw) == "string" then
                local num = tonumber(string.match(raw, "%d+"))
                if num and num >= 100 and num <= 599 then return num end
            end
            if res.Success == true then return 200 end
            return 0
        end

        -- Priorities: High-Speed C# Engine Endpoints -> Node.js Gateway -> Webhook Fallback
        local endpoints = {
            cleanServerUrl .. "/api/lua/update",
            cleanServerUrl .. "/api/webhook/roblox"
        }

        if env.OceanForgeCSharpBridgeUrl or _G.OceanForgeCSharpBridgeUrl then
            table.insert(endpoints, 1, string_gsub(tostring(env.OceanForgeCSharpBridgeUrl or _G.OceanForgeCSharpBridgeUrl), "/+$", "") .. "/api/lua/update")
        end

        local reqHeaders = {
            ["Content-Type"] = "application/json",
            ["x-api-key"] = apiKey,
            ["x-csharp-accelerated"] = "true",
            ["x-csharp-dedup-hash"] = currentFnvHash,
            ["x-csharp-state-unchanged"] = isStateUnchanged and "true" or "false"
        }

        local successReq = false
        local finalStatusCode = 0
        local lastErrorMsg = "unknown"

        for _, endpointUrl in ipairs(endpoints) do
            local reqPayload = {
                Url = endpointUrl,
                url = endpointUrl,
                Method = "POST",
                method = "POST",
                Headers = reqHeaders,
                headers = reqHeaders,
                Body = jsonPayload,
                body = jsonPayload,
                Timeout = 15,
                timeout = 15
            }

            local ok, response = pcall(requestLib, reqPayload)
            local code = getStatusCode(response)

            if (not ok or code == 0) then
                task.wait(1.5)
                ok, response = pcall(requestLib, reqPayload)
                code = getStatusCode(response)
            end

            if ok and response and (code >= 200 and code < 300) then
                successReq = true
                finalStatusCode = code
                lastPayloadHash = currentFnvHash
                lastPayloadTime = tick()
                break
            else
                finalStatusCode = code
                if not ok then
                    lastErrorMsg = tostring(response or "Connection Timeout")
                elseif response then
                    lastErrorMsg = tostring(code ~= 0 and code or (response.StatusText or response.status or "0 (No Response/Sleep)"))
                end
            end
        end

        if successReq then
            LedIndicator.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
            LedLabel.Text = "STATUS: C# SPEED ENGINE ACTIVE ⚡✅"
            LedLabel.TextColor3 = Color3.fromRGB(74, 222, 128)

            if lastConnectionStatus ~= true then
                lastConnectionStatus = true
                sendNotification("⚡ C# ACCELERATION ACTIVE", "Đã kết nối truyền dữ liệu tốc độ cao C# Engine!", 6)
            end
            print("OceanForge C# Engine: Synchronized stats successfully (FNV Hash: " .. currentFnvHash .. ")")
        else
            LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
            LedLabel.Text = "STATUS: KẾT NỐI THẤT BẠI ❌"
            LedLabel.TextColor3 = Color3.fromRGB(239, 68, 68)

            if lastConnectionStatus ~= false then
                lastConnectionStatus = false
                sendNotification("🔴 KẾT NỐI THẤT BẠI", "Không thể kết nối C# Backend (Mã lỗi: " .. lastErrorMsg .. ")", 8)
            end
            warn("OceanForge C# Engine: Synchronization failed. Status: " .. lastErrorMsg)
        end
    end)
end

-- Setup Heartbeat schedule loop & initialize Anti-Ban Protection
local function startHeartbeatScheduler()
    if heartbeatLoopActive then return end
    heartbeatLoopActive = true

    initAntiBanEngine()
    
    task.spawn(function()
        while heartbeatLoopActive and isInstanceValid() do
            local info = TweenInfo.new(0.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, 0, true)
            local ledTween = TweenService:Create(LedIndicator, info, {Size = UDim2.new(0, 11, 0, 11), Position = UDim2.new(0, -1, 0.5, -5)})
            ledTween:Play()
            task.wait(2.5)
        end
    end)

    -- Observe equipment changes (Fast local loop without remote calls)
    task.spawn(function()
        local lastEquippedHash = ""
        while heartbeatLoopActive and isInstanceValid() do
            local inv = scanInventory(true)
            local currentDetails = getEquippedDetails(inv)
            local currentHash = tostring(currentDetails.fightingStyle) .. "|" .. tostring(currentDetails.sword) .. "|" .. tostring(currentDetails.gun) .. "|" .. tostring(currentDetails.accessory)
            
            if lastEquippedHash ~= "" and currentHash ~= lastEquippedHash then
                lastEquippedHash = currentHash
                
                task.spawn(function()
                    local timeSinceLastSend = tick() - (lastSendTime or 0)
                    if timeSinceLastSend < 15 then
                        task.wait(15 - timeSinceLastSend)
                    end
                    
                    if isInstanceValid() then
                        print("OceanForge: Equipment state changed (" .. currentHash .. "). Sending update...")
                        pcall(sendStats)
                    end
                end)
            else
                lastEquippedHash = currentHash
            end
            task.wait(2)
        end
    end)

    -- Main Heartbeat Loop with Humanized Random Jitter
    task.spawn(function()
        while heartbeatLoopActive and isInstanceValid() do
            pcall(sendStats)
            local jitter = math.random(-2, 2)
            local waitTime = math.max(5, (env.OceanForgeHeartbeatInterval or 15) + jitter)
            task.wait(waitTime)
        end
    end)
end

local function stopHeartbeatScheduler()
    heartbeatLoopActive = false
    LedIndicator.BackgroundColor3 = Color3.fromRGB(127, 29, 29)
end

-- Global cleanup handle for re-runs & multi-script compatibility
local function cleanupEngine()
    stopHeartbeatScheduler()
    for _, conn in ipairs(antiBanConnections) do
        if conn and conn.Disconnect then
            pcall(function() conn:Disconnect() end)
        end
    end
    antiBanConnections = {}
    if ScreenGui then
        pcall(function() ScreenGui:Destroy() end)
    end
    if pulseTween then
        pcall(function() pulseTween:Cancel() end)
    end
end

env.OceanForgeCleanup = cleanupEngine
_G.OceanForgeCleanup = cleanupEngine

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
                    if delfile then
                        pcall(delfile, "crimsonforge_key.json")
                    end
                    print("CrimsonForge: Saved API key has expired and was deleted.")
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

-- Notification on script execute start
sendNotification("🔥 CRIMSONFORGE PRO", "Đang khởi chạy script & kiểm tra kết nối Dashboard...", 4)

-- Start the engine automatically
local savedKey = loadSavedKey()
local currentKey = env.OceanForgeApiKey or _G.OceanForgeApiKey
if currentKey and currentKey ~= "" and currentKey ~= "YOUR_API_KEY_HERE" then
    saveKey(currentKey)
    startHeartbeatScheduler()
elseif savedKey and savedKey ~= "" then
    env.OceanForgeApiKey = savedKey
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
        if (input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseMovement) then
            dragInput = input
        end
    end)

    cloneref(game:GetService("UserInputService")).InputChanged:Connect(function(input)
        if input == dragInput and dragToggle then
            updateInput(input)
        end
    end)

    cloneref(game:GetService("UserInputService")).InputEnded:Connect(function(input)
        if (input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch) then
            dragToggle = false
        end
    end)
end

makeDraggable(MainFrame)
makeDraggable(AnchorBtn)
