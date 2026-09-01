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
    local executorName = "Roblox Executor"
    
    pcall(function()
        if identifyexecutor then
            local name, ver = identifyexecutor()
            executorName = tostring(name) .. (ver and (" " .. tostring(ver)) or "")
        elseif getexecutorname then
            executorName = tostring(getexecutorname())
        end
    end)
    
    pcall(function()
        if _G.SameHwid and _G.SameHwid ~= "" then
            hwid = tostring(_G.SameHwid)
        elseif _G.CustomHWID and _G.CustomHWID ~= "" then
            hwid = tostring(_G.CustomHWID)
        elseif _G.AndroidID and _G.AndroidID ~= "" then
            hwid = tostring(_G.AndroidID)
        elseif env.SameHwid and env.SameHwid ~= "" then
            hwid = tostring(env.SameHwid)
        elseif gethwid then
            hwid = tostring(gethwid())
        elseif get_hwid then
            hwid = tostring(get_hwid())
        elseif env.gethwid then
            hwid = tostring(env.gethwid())
        end
    end)
    
    if not hwid or hwid == "" then
        pcall(function()
            local rbxAnalytics = cloneref(game:GetService("RbxAnalyticsService"))
            if rbxAnalytics and rbxAnalytics.GetClientId then
                hwid = tostring(rbxAnalytics:GetClientId())
            end
        end)
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
    
    local finalDeviceId = hwid or ("DEV_" .. tostring(LocalPlayer.UserId))
    local deviceDescription = platformName .. " (" .. executorName .. " | ID: " .. string.sub(finalDeviceId, 1, 16) .. ")"
    
    return {
        deviceId = finalDeviceId,
        androidId = finalDeviceId,
        hwid = finalDeviceId,
        sameHwid = (_G.SameHwid or _G.CustomHWID or env.SameHwid) and true or false,
        device = deviceDescription,
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
-- BLUE X HUB KAITUN BLOX FRUITS (FREE) - ANIME FURINA GUI
-- ==========================================================

local isMinimized = false
local startTime = tick()
local pulseTween = nil

local function getFormattedUptime()
    local elapsed = math.floor(tick() - startTime)
    local hours = math.floor(elapsed / 3600)
    local mins = math.floor((elapsed % 3600) / 60)
    local secs = elapsed % 60
    return string.format("%02d:%02d:%02d", hours, mins, secs)
end

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "BlueXHubKaitun_" .. tostring(math.random(100000, 999999))
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

-- Main Blue X Hub Canvas (Cyan / Aqua Gradient Window)
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 500, 0, 240)
MainFrame.Position = UDim2.new(0.5, -250, 0.35, -120)
MainFrame.BackgroundColor3 = Color3.fromRGB(0, 195, 245)
MainFrame.BorderSizePixel = 0
MainFrame.Active = true
MainFrame.Draggable = true
MainFrame.ClipsDescendants = false
MainFrame.Parent = ScreenGui

local MainGradient = Instance.new("UIGradient")
MainGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 175, 240)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 205, 250)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 230, 255))
}
MainGradient.Rotation = 45
MainGradient.Parent = MainFrame

local MainCorner = Instance.new("UICorner")
MainCorner.CornerRadius = UDim.new(0, 16)
MainCorner.Parent = MainFrame

-- Glowing Neon Yellow/Green Border Stroke
local MainStroke = Instance.new("UIStroke")
MainStroke.Thickness = 2.4
MainStroke.Color = Color3.fromRGB(160, 250, 60) -- Lime Yellow Neon
MainStroke.Parent = MainFrame

-- Left Character Image (Furina Anime Character Sticker)
local CharacterImage = Instance.new("ImageLabel")
CharacterImage.Name = "CharacterImage"
CharacterImage.Size = UDim2.new(0, 175, 0, 245)
CharacterImage.Position = UDim2.new(0, -5, 0, -5)
CharacterImage.BackgroundTransparency = 1
CharacterImage.Image = "rbxassetid://15291244018" -- Furina High-Quality Transparent Render
CharacterImage.ScaleType = Enum.ScaleType.Fit
CharacterImage.Parent = MainFrame

-- Fallback check for character render image
pcall(function()
    if not CharacterImage.IsLoaded then
        CharacterImage.Image = "rbxassetid://15446077598"
    end
end)

-- Minimize Button (Top Right)
local MinBtn = Instance.new("TextButton")
MinBtn.Name = "MinBtn"
MinBtn.Size = UDim2.new(0, 24, 0, 24)
MinBtn.Position = UDim2.new(1, -30, 0, 8)
MinBtn.BackgroundColor3 = Color3.fromRGB(0, 120, 180)
MinBtn.BackgroundTransparency = 0.3
MinBtn.Text = "−"
MinBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
MinBtn.Font = Enum.Font.GothamBold
MinBtn.TextSize = 16
MinBtn.Parent = MainFrame

local MinCorner = Instance.new("UICorner")
MinCorner.CornerRadius = UDim.new(0, 6)
MinCorner.Parent = MinBtn

local MinStroke = Instance.new("UIStroke")
MinStroke.Thickness = 1
MinStroke.Color = Color3.fromRGB(160, 250, 60)
MinStroke.Parent = MinBtn

-- Floating Anchor Button when Minimized
local AnchorBtn = Instance.new("TextButton")
AnchorBtn.Name = "AnchorBtn"
AnchorBtn.Size = UDim2.new(0, 48, 0, 48)
AnchorBtn.Position = UDim2.new(0.95, -48, 0.85, -48)
AnchorBtn.BackgroundColor3 = Color3.fromRGB(0, 195, 245)
AnchorBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
AnchorBtn.Text = "🌊"
AnchorBtn.Font = Enum.Font.GothamBold
AnchorBtn.TextSize = 22
AnchorBtn.Visible = false
AnchorBtn.Parent = ScreenGui

local AnchorCorner = Instance.new("UICorner")
AnchorCorner.CornerRadius = UDim.new(0, 24)
AnchorCorner.Parent = AnchorBtn

local AnchorStroke = Instance.new("UIStroke")
AnchorStroke.Thickness = 2
AnchorStroke.Color = Color3.fromRGB(160, 250, 60)
AnchorStroke.Parent = AnchorBtn

-- Right Content Container
local ContentFrame = Instance.new("Frame")
ContentFrame.Name = "ContentFrame"
ContentFrame.Size = UDim2.new(1, -170, 1, 0)
ContentFrame.Position = UDim2.new(0, 165, 0, 0)
ContentFrame.BackgroundTransparency = 1
ContentFrame.Parent = MainFrame

-- Header Title: Blue X Hub Kaitun Blox Fruits (Free)
local TitleLabel = Instance.new("TextLabel")
TitleLabel.Name = "TitleLabel"
TitleLabel.Size = UDim2.new(1, -35, 0, 32)
TitleLabel.Position = UDim2.new(0, 0, 0, 10)
TitleLabel.BackgroundTransparency = 1
TitleLabel.Text = "Blue X Hub Kaitun Blox Fruits (Free)"
TitleLabel.TextColor3 = Color3.fromRGB(0, 235, 255)
TitleLabel.Font = Enum.Font.FredokaOne
TitleLabel.TextSize = 16
TitleLabel.TextXAlignment = Enum.TextXAlignment.Center
TitleLabel.Parent = ContentFrame

local TitleStroke = Instance.new("UIStroke")
TitleStroke.Thickness = 2
TitleStroke.Color = Color3.fromRGB(0, 0, 0)
TitleStroke.Parent = TitleLabel

-- Glowing Green Gradient Divider Line
local GreenLine = Instance.new("Frame")
GreenLine.Name = "GreenLine"
GreenLine.Size = UDim2.new(0.92, 0, 0, 2)
GreenLine.Position = UDim2.new(0.04, 0, 0, 48)
GreenLine.BackgroundColor3 = Color3.fromRGB(160, 250, 60)
GreenLine.BorderSizePixel = 0
GreenLine.Parent = ContentFrame

local LineGradient = Instance.new("UIGradient")
LineGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(34, 197, 94)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(163, 230, 53)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(34, 197, 94))
}
LineGradient.Parent = GreenLine

-- Status Line 1: Status: Farm Level
local StatusLabel = Instance.new("TextLabel")
StatusLabel.Name = "StatusLabel"
StatusLabel.Size = UDim2.new(1, -10, 0, 26)
StatusLabel.Position = UDim2.new(0, 0, 0, 58)
StatusLabel.BackgroundTransparency = 1
StatusLabel.Text = "Status: Farm Level"
StatusLabel.TextColor3 = Color3.fromRGB(0, 245, 255)
StatusLabel.Font = Enum.Font.FredokaOne
StatusLabel.TextSize = 18
StatusLabel.TextXAlignment = Enum.TextXAlignment.Center
StatusLabel.Parent = ContentFrame

local StatusStroke = Instance.new("UIStroke")
StatusStroke.Thickness = 2
StatusStroke.Color = Color3.fromRGB(0, 0, 0)
StatusStroke.Parent = StatusLabel

-- Status Line 2: Accept Quest Farm Level
local QuestLabel = Instance.new("TextLabel")
QuestLabel.Name = "QuestLabel"
QuestLabel.Size = UDim2.new(1, -10, 0, 24)
QuestLabel.Position = UDim2.new(0, 0, 0, 88)
QuestLabel.BackgroundTransparency = 1
QuestLabel.Text = "Accept Quest Farm Level"
QuestLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
QuestLabel.Font = Enum.Font.FredokaOne
QuestLabel.TextSize = 16
QuestLabel.TextXAlignment = Enum.TextXAlignment.Center
QuestLabel.Parent = ContentFrame

local QuestStroke = Instance.new("UIStroke")
QuestStroke.Thickness = 2
QuestStroke.Color = Color3.fromRGB(0, 0, 0)
QuestStroke.Parent = QuestLabel

-- Stats Row 1: Lv & Uptime
local LevelLabel = Instance.new("TextLabel")
LevelLabel.Name = "LevelLabel"
LevelLabel.Size = UDim2.new(0.48, 0, 0, 26)
LevelLabel.Position = UDim2.new(0, 0, 0, 126)
LevelLabel.BackgroundTransparency = 1
LevelLabel.Text = "Lv: 1"
LevelLabel.TextColor3 = Color3.fromRGB(251, 191, 36) -- Golden Orange
LevelLabel.Font = Enum.Font.FredokaOne
LevelLabel.TextSize = 18
LevelLabel.TextXAlignment = Enum.TextXAlignment.Center
LevelLabel.Parent = ContentFrame

local LevelStroke = Instance.new("UIStroke")
LevelStroke.Thickness = 2
LevelStroke.Color = Color3.fromRGB(0, 0, 0)
LevelStroke.Parent = LevelLabel

local UptimeLabel = Instance.new("TextLabel")
UptimeLabel.Name = "UptimeLabel"
UptimeLabel.Size = UDim2.new(0.50, 0, 0, 26)
UptimeLabel.Position = UDim2.new(0.50, 0, 0, 126)
UptimeLabel.BackgroundTransparency = 1
UptimeLabel.Text = "Uptime: 00:00:00"
UptimeLabel.TextColor3 = Color3.fromRGB(0, 245, 255)
UptimeLabel.Font = Enum.Font.FredokaOne
UptimeLabel.TextSize = 17
UptimeLabel.TextXAlignment = Enum.TextXAlignment.Center
UptimeLabel.Parent = ContentFrame

local UptimeStroke = Instance.new("UIStroke")
UptimeStroke.Thickness = 2
UptimeStroke.Color = Color3.fromRGB(0, 0, 0)
UptimeStroke.Parent = UptimeLabel

-- Stats Row 2: Beli & Frags
local BeliLabel = Instance.new("TextLabel")
BeliLabel.Name = "BeliLabel"
BeliLabel.Size = UDim2.new(0.48, 0, 0, 26)
BeliLabel.Position = UDim2.new(0, 0, 0, 160)
BeliLabel.BackgroundTransparency = 1
BeliLabel.Text = "Beli: 0"
BeliLabel.TextColor3 = Color3.fromRGB(134, 239, 172) -- Bright Lime Green
BeliLabel.Font = Enum.Font.FredokaOne
BeliLabel.TextSize = 18
BeliLabel.TextXAlignment = Enum.TextXAlignment.Center
BeliLabel.Parent = ContentFrame

local BeliStroke = Instance.new("UIStroke")
BeliStroke.Thickness = 2
BeliStroke.Color = Color3.fromRGB(0, 0, 0)
BeliStroke.Parent = BeliLabel

local FragLabel = Instance.new("TextLabel")
FragLabel.Name = "FragLabel"
FragLabel.Size = UDim2.new(0.50, 0, 0, 26)
FragLabel.Position = UDim2.new(0.50, 0, 0, 160)
FragLabel.BackgroundTransparency = 1
FragLabel.Text = "Frags: 0"
FragLabel.TextColor3 = Color3.fromRGB(0, 245, 255)
FragLabel.Font = Enum.Font.FredokaOne
FragLabel.TextSize = 18
FragLabel.TextXAlignment = Enum.TextXAlignment.Center
FragLabel.Parent = ContentFrame

local FragStroke = Instance.new("UIStroke")
FragStroke.Thickness = 2
FragStroke.Color = Color3.fromRGB(0, 0, 0)
FragStroke.Parent = FragLabel

-- Bottom Sub-Row: Active Hub & Same HWID Pill Badge
local BottomBadge = Instance.new("TextLabel")
BottomBadge.Name = "BottomBadge"
BottomBadge.Size = UDim2.new(0.92, 0, 0, 22)
BottomBadge.Position = UDim2.new(0.04, 0, 0, 198)
BottomBadge.BackgroundColor3 = Color3.fromRGB(0, 40, 80)
BottomBadge.BackgroundTransparency = 0.4
BottomBadge.Text = "🤖 Hub: Detecting... | 📱 HWID: DEV_..."
BottomBadge.TextColor3 = Color3.fromRGB(255, 255, 255)
BottomBadge.Font = Enum.Font.GothamBold
BottomBadge.TextSize = 9.5
BottomBadge.TextXAlignment = Enum.TextXAlignment.Center
BottomBadge.Parent = ContentFrame

local BottomCorner = Instance.new("UICorner")
BottomCorner.CornerRadius = UDim.new(0, 6)
BottomCorner.Parent = BottomBadge

local BottomStroke = Instance.new("UIStroke")
BottomStroke.Thickness = 1
BottomStroke.Color = Color3.fromRGB(0, 160, 220)
BottomStroke.Parent = BottomBadge

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

    -- Update Blue X Kaitun UI Labels
    LevelLabel.Text = "Lv: " .. formatComma(level)
    BeliLabel.Text = "Beli: " .. formatComma(beli)
    FragLabel.Text = "Frags: " .. formatComma(fragments)
    UptimeLabel.Text = "Uptime: " .. getFormattedUptime()

    local currentIsland = getIslandName()
    local currentSea = getSea()

    local hubText = (activeHub and activeHub ~= "None / Custom Script") and activeHub or "Kaitun Script"
    local hwidDisplay = deviceInfo.hwid or deviceInfo.deviceId or "Unknown"
    if #hwidDisplay > 10 then
        hwidDisplay = string.sub(hwidDisplay, 1, 8) .. "..."
    end
    BottomBadge.Text = "🤖 " .. tostring(hubText) .. " | 🗺️ " .. tostring(currentIsland) .. " (Sea " .. tostring(currentSea) .. ") | 📱 " .. tostring(hwidDisplay)

    local status = "idle"
    local statusDisplay = "Status: Farm Level"
    local questDisplay = "Accept Quest Farm Level"

    local myChar = LocalPlayer.Character
    local myHrp = myChar and myChar:FindFirstChild("HumanoidRootPart")
    local myHumanoid = myChar and myChar:FindFirstChild("Humanoid")

    if myHumanoid and myHumanoid.MoveDirection.Magnitude > 0 then
        status = "grinding"
        statusDisplay = "Status: Farm Level"
        questDisplay = "Grinding Quest Monster"
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
                        statusDisplay = "Status: Boss Hunter"
                        questDisplay = "Fighting Boss: " .. enemy.Name
                    else
                        status = "grinding"
                        statusDisplay = "Status: Farm Level"
                        questDisplay = "Attacking: " .. enemy.Name
                    end
                    break
                end
            end
        end
    end

    StatusLabel.Text = statusDisplay
    QuestLabel.Text = questDisplay

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
            MainStroke.Color = Color3.fromRGB(245, 158, 11)
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
            MainStroke.Color = Color3.fromRGB(160, 250, 60)

            if lastConnectionStatus ~= true then
                lastConnectionStatus = true
                sendNotification("⚡ BLUE X KAITUN CONNECTED", "Đã kết nối truyền dữ liệu tốc độ cao Dashboard!", 6)
            end
            print("OceanForge C# Engine: Synchronized stats successfully (FNV Hash: " .. currentFnvHash .. ")")
        else
            MainStroke.Color = Color3.fromRGB(244, 63, 94)

            if lastConnectionStatus ~= false then
                lastConnectionStatus = false
                sendNotification("🔴 KẾT NỐI THẤT BẠI", "Không thể kết nối Backend (Mã lỗi: " .. lastErrorMsg .. ")", 8)
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
            local info = TweenInfo.new(0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, 0, true)
            local strokeTween = TweenService:Create(MainStroke, info, {Thickness = 3.2})
            strokeTween:Play()
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
    MainStroke.Color = Color3.fromRGB(244, 63, 94)
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
sendNotification("🌊 BLUE X HUB KAITUN", "Đang khởi chạy script Kaitun & đồng bộ Dashboard...", 4)

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
