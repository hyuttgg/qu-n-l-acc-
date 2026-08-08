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
env.OceanForgeApiKey = env.OceanForgeApiKey or _G.OceanForgeApiKey or ""
env.OceanForgeServerUrl = env.OceanForgeServerUrl or _G.OceanForgeServerUrl or "https://quan-ly-acc-viet-nam.onrender.com"
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

-- ==========================================================
-- LUXURIOUS CRIMSON RED GUI DESIGN
-- ==========================================================

local isMinimized = false
local pulseTween = nil

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "OceanForgeGui_" .. tostring(math.random(100000, 999999))
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

-- Main Window Frame (Luxurious Glassmorphism Deep Velvet Crimson)
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 410, 0, 220)
MainFrame.Position = UDim2.new(0.5, -205, 0.4, -110)
MainFrame.BackgroundColor3 = Color3.fromRGB(15, 8, 12) -- Deep Obsidian Maroon
MainFrame.BackgroundTransparency = 0.08
MainFrame.BorderSizePixel = 0
MainFrame.Active = true
MainFrame.Draggable = true
MainFrame.Parent = ScreenGui

local MainGradient = Instance.new("UIGradient")
MainGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(22, 9, 15)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(16, 7, 12)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(32, 10, 18))
}
MainGradient.Rotation = 45
MainGradient.Parent = MainFrame

local MainCorner = Instance.new("UICorner")
MainCorner.CornerRadius = UDim.new(0, 14)
MainCorner.Parent = MainFrame

-- Glowing Neon Red Dual-Tone Border Stroke
local MainStroke = Instance.new("UIStroke")
MainStroke.Thickness = 1.8
MainStroke.Color = Color3.fromRGB(239, 68, 68)
MainStroke.Parent = MainFrame

local StrokeGradient = Instance.new("UIGradient")
StrokeGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 45, 85)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(225, 29, 72)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(159, 18, 57))
}
StrokeGradient.Rotation = 90
StrokeGradient.Parent = MainStroke

-- Topbar
local Topbar = Instance.new("Frame")
Topbar.Name = "Topbar"
Topbar.Size = UDim2.new(1, 0, 0, 42)
Topbar.BackgroundTransparency = 1
Topbar.Parent = MainFrame

local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Size = UDim2.new(0.65, 0, 1, 0)
Title.Position = UDim2.new(0.04, 0, 0, 0)
Title.BackgroundTransparency = 1
Title.Text = "🔥 CRIMSONFORGE PRO"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 14
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.Parent = Topbar

local VersionBadge = Instance.new("TextLabel")
VersionBadge.Size = UDim2.new(0, 52, 0, 18)
VersionBadge.Position = UDim2.new(0.55, 0, 0.28, 0)
VersionBadge.BackgroundColor3 = Color3.fromRGB(225, 29, 72)
VersionBadge.BackgroundTransparency = 0.2
VersionBadge.Text = "V2.5 LUA"
VersionBadge.TextColor3 = Color3.fromRGB(255, 255, 255)
VersionBadge.Font = Enum.Font.GothamBold
VersionBadge.TextSize = 9
VersionBadge.Parent = Topbar

local BadgeCorner = Instance.new("UICorner")
BadgeCorner.CornerRadius = UDim.new(0, 6)
BadgeCorner.Parent = VersionBadge

local TopDivider = Instance.new("Frame")
TopDivider.Size = UDim2.new(0.92, 0, 0, 1)
TopDivider.Position = UDim2.new(0.04, 0, 1, 0)
TopDivider.BackgroundColor3 = Color3.fromRGB(159, 18, 57)
TopDivider.BackgroundTransparency = 0.3
TopDivider.BorderSizePixel = 0
TopDivider.Parent = Topbar

-- Minimize Button
local MinBtn = Instance.new("TextButton")
MinBtn.Name = "MinBtn"
MinBtn.Size = UDim2.new(0, 28, 0, 28)
MinBtn.Position = UDim2.new(0.92, -14, 0.5, -14)
MinBtn.BackgroundColor3 = Color3.fromRGB(35, 14, 22)
MinBtn.BackgroundTransparency = 0.2
MinBtn.Text = "−"
MinBtn.TextColor3 = Color3.fromRGB(255, 120, 140)
MinBtn.Font = Enum.Font.GothamBold
MinBtn.TextSize = 16
MinBtn.Parent = Topbar

local MinCorner = Instance.new("UICorner")
MinCorner.CornerRadius = UDim.new(0, 8)
MinCorner.Parent = MinBtn

local MinStroke = Instance.new("UIStroke")
MinStroke.Thickness = 1
MinStroke.Color = Color3.fromRGB(225, 29, 72)
MinStroke.Parent = MinBtn

-- Floating Anchor Button when Minimized
local AnchorBtn = Instance.new("TextButton")
AnchorBtn.Name = "AnchorBtn"
AnchorBtn.Size = UDim2.new(0, 48, 0, 48)
AnchorBtn.Position = UDim2.new(0.95, -48, 0.85, -48)
AnchorBtn.BackgroundColor3 = Color3.fromRGB(18, 8, 14)
AnchorBtn.TextColor3 = Color3.fromRGB(255, 45, 85)
AnchorBtn.Text = "🔥"
AnchorBtn.Font = Enum.Font.GothamBold
AnchorBtn.TextSize = 22
AnchorBtn.Visible = false
AnchorBtn.Parent = ScreenGui

local AnchorCorner = Instance.new("UICorner")
AnchorCorner.CornerRadius = UDim.new(0, 24)
AnchorCorner.Parent = AnchorBtn

local AnchorStroke = Instance.new("UIStroke")
AnchorStroke.Thickness = 1.6
AnchorStroke.Color = Color3.fromRGB(255, 45, 85)
AnchorStroke.Parent = AnchorBtn

-- Monitor Screen Body
local MonitorScreen = Instance.new("Frame")
MonitorScreen.Name = "MonitorScreen"
MonitorScreen.Size = UDim2.new(1, 0, 0.78, 0)
MonitorScreen.Position = UDim2.new(0, 0, 0.22, 0)
MonitorScreen.BackgroundTransparency = 1
MonitorScreen.Visible = true
MonitorScreen.Parent = MainFrame

-- Status Bar Row
local StatusRow = Instance.new("Frame")
StatusRow.Size = UDim2.new(0.92, 0, 0, 20)
StatusRow.Position = UDim2.new(0.04, 0, 0.04, 0)
StatusRow.BackgroundTransparency = 1
StatusRow.Parent = MonitorScreen

local LedIndicator = Instance.new("Frame")
LedIndicator.Name = "LedIndicator"
LedIndicator.Size = UDim2.new(0, 8, 0, 8)
LedIndicator.Position = UDim2.new(0, 0, 0.5, -4)
LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
LedIndicator.BorderSizePixel = 0
LedIndicator.Parent = StatusRow

local LedCorner = Instance.new("UICorner")
LedCorner.CornerRadius = UDim.new(0, 4)
LedCorner.Parent = LedIndicator

local LedLabel = Instance.new("TextLabel")
LedLabel.Size = UDim2.new(0.95, -12, 1, 0)
LedLabel.Position = UDim2.new(0, 14, 0, 0)
LedLabel.BackgroundTransparency = 1
LedLabel.Text = "STATUS: SYNCING... | 🛡️ ANTI-BAN: ACTIVE"
LedLabel.TextColor3 = Color3.fromRGB(255, 120, 140)
LedLabel.Font = Enum.Font.GothamBold
LedLabel.TextSize = 10
LedLabel.TextXAlignment = Enum.TextXAlignment.Left
LedLabel.Parent = StatusRow

-- 2-Column Luxurious Cards Container
local CardContainer = Instance.new("Frame")
CardContainer.Size = UDim2.new(0.92, 0, 0.76, 0)
CardContainer.Position = UDim2.new(0.04, 0, 0.2, 0)
CardContainer.BackgroundTransparency = 1
CardContainer.Parent = MonitorScreen

-- Card 1: Player Profile & Location (Left Card)
local Card1 = Instance.new("Frame")
Card1.Size = UDim2.new(0.48, 0, 1, 0)
Card1.Position = UDim2.new(0, 0, 0, 0)
Card1.BackgroundColor3 = Color3.fromRGB(24, 11, 17)
Card1.BackgroundTransparency = 0.2
Card1.BorderSizePixel = 0
Card1.Parent = CardContainer

local Card1Corner = Instance.new("UICorner")
Card1Corner.CornerRadius = UDim.new(0, 10)
Card1Corner.Parent = Card1

local Card1Stroke = Instance.new("UIStroke")
Card1Stroke.Thickness = 1
Card1Stroke.Color = Color3.fromRGB(80, 25, 40)
Card1Stroke.Parent = Card1

local Card1Title = Instance.new("TextLabel")
Card1Title.Size = UDim2.new(0.9, 0, 0, 22)
Card1Title.Position = UDim2.new(0.08, 0, 0.05, 0)
Card1Title.BackgroundTransparency = 1
Card1Title.Text = "👤 PROFILE & LOCATION"
Card1Title.TextColor3 = Color3.fromRGB(255, 150, 170)
Card1Title.Font = Enum.Font.GothamBold
Card1Title.TextSize = 10
Card1Title.TextXAlignment = Enum.TextXAlignment.Left
Card1Title.Parent = Card1

local UsernameLabel = Instance.new("TextLabel")
UsernameLabel.Size = UDim2.new(0.9, 0, 0, 24)
UsernameLabel.Position = UDim2.new(0.08, 0, 0.28, 0)
UsernameLabel.BackgroundTransparency = 1
UsernameLabel.Text = "Account: " .. LocalPlayer.Name
UsernameLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
UsernameLabel.Font = Enum.Font.GothamSemibold
UsernameLabel.TextSize = 11
UsernameLabel.TextXAlignment = Enum.TextXAlignment.Left
UsernameLabel.Parent = Card1

local IslandLabel = Instance.new("TextLabel")
IslandLabel.Size = UDim2.new(0.9, 0, 0, 24)
IslandLabel.Position = UDim2.new(0.08, 0, 0.52, 0)
IslandLabel.BackgroundTransparency = 1
IslandLabel.Text = "🗺️ Scanning..."
IslandLabel.TextColor3 = Color3.fromRGB(244, 197, 205)
IslandLabel.Font = Enum.Font.GothamSemibold
IslandLabel.TextSize = 11
IslandLabel.TextXAlignment = Enum.TextXAlignment.Left
IslandLabel.Parent = Card1

local AntiBanPill = Instance.new("TextLabel")
AntiBanPill.Size = UDim2.new(0.9, 0, 0, 20)
AntiBanPill.Position = UDim2.new(0.08, 0, 0.76, 0)
AntiBanPill.BackgroundTransparency = 1
AntiBanPill.Text = "🛡️ Anti-Ban Shield: ACTIVE"
AntiBanPill.TextColor3 = Color3.fromRGB(74, 222, 128) -- Soft Green
AntiBanPill.Font = Enum.Font.GothamBold
AntiBanPill.TextSize = 9.5
AntiBanPill.TextXAlignment = Enum.TextXAlignment.Left
AntiBanPill.Parent = Card1

-- Card 2: Stats & Economy (Right Card)
local Card2 = Instance.new("Frame")
Card2.Size = UDim2.new(0.49, 0, 1, 0)
Card2.Position = UDim2.new(0.51, 0, 0, 0)
Card2.BackgroundColor3 = Color3.fromRGB(24, 11, 17)
Card2.BackgroundTransparency = 0.2
Card2.BorderSizePixel = 0
Card2.Parent = CardContainer

local Card2Corner = Instance.new("UICorner")
Card2Corner.CornerRadius = UDim.new(0, 10)
Card2Corner.Parent = Card2

local Card2Stroke = Instance.new("UIStroke")
Card2Stroke.Thickness = 1
Card2Stroke.Color = Color3.fromRGB(80, 25, 40)
Card2Stroke.Parent = Card2

local Card2Title = Instance.new("TextLabel")
Card2Title.Size = UDim2.new(0.9, 0, 0, 22)
Card2Title.Position = UDim2.new(0.08, 0, 0.05, 0)
Card2Title.BackgroundTransparency = 1
Card2Title.Text = "📊 STATS & WEALTH"
Card2Title.TextColor3 = Color3.fromRGB(255, 150, 170)
Card2Title.Font = Enum.Font.GothamBold
Card2Title.TextSize = 10
Card2Title.TextXAlignment = Enum.TextXAlignment.Left
Card2Title.Parent = Card2

local LevelLabel = Instance.new("TextLabel")
LevelLabel.Size = UDim2.new(0.9, 0, 0, 24)
LevelLabel.Position = UDim2.new(0.08, 0, 0.28, 0)
LevelLabel.BackgroundTransparency = 1
LevelLabel.Text = "⚔️ Level: -- / 2800"
LevelLabel.TextColor3 = Color3.fromRGB(251, 113, 133) -- Rose Red
LevelLabel.Font = Enum.Font.GothamSemibold
LevelLabel.TextSize = 11
LevelLabel.TextXAlignment = Enum.TextXAlignment.Left
LevelLabel.Parent = Card2

local BeliLabel = Instance.new("TextLabel")
BeliLabel.Size = UDim2.new(0.9, 0, 0, 24)
BeliLabel.Position = UDim2.new(0.08, 0, 0.52, 0)
BeliLabel.BackgroundTransparency = 1
BeliLabel.Text = "💰 Beli: $0"
BeliLabel.TextColor3 = Color3.fromRGB(250, 204, 21) -- Bright Gold
BeliLabel.Font = Enum.Font.GothamSemibold
BeliLabel.TextSize = 11
BeliLabel.TextXAlignment = Enum.TextXAlignment.Left
BeliLabel.Parent = Card2

local FragLabel = Instance.new("TextLabel")
FragLabel.Size = UDim2.new(0.9, 0, 0, 20)
FragLabel.Position = UDim2.new(0.08, 0, 0.76, 0)
FragLabel.BackgroundTransparency = 1
FragLabel.Text = "💎 Fragments: 0"
FragLabel.TextColor3 = Color3.fromRGB(192, 132, 252) -- Purple Glow
FragLabel.Font = Enum.Font.GothamSemibold
FragLabel.TextSize = 11
FragLabel.TextXAlignment = Enum.TextXAlignment.Left
FragLabel.Parent = Card2

local function formatComma(amount)
    local formatted = tostring(amount)
    local k
    repeat
        formatted, k = string_gsub(formatted, "^(-?%d+)(%d%d%d)", "%1,%2")
    until k == 0
    return formatted
end

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
    
    UsernameLabel.Text = "👤 " .. LocalPlayer.Name
    IslandLabel.Text = "🗺️ " .. getIslandName() .. " (Sea " .. getSea() .. ")"
    LevelLabel.Text = "⚔️ Level: " .. formatComma(level) .. " / 2800"
    BeliLabel.Text = "💰 Beli: $" .. formatComma(beli)
    FragLabel.Text = "💎 Fragments: " .. formatComma(fragments)
    
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

    local apiKey = env.OceanForgeApiKey or _G.OceanForgeApiKey or ""

    local payload = {
        apiKey = apiKey,
        username = LocalPlayer.Name,
        robloxUsername = LocalPlayer.Name,
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
        device = "Roblox Client",
        inventory = inventory
    }

    local success, jsonPayload = pcall(function()
        return HttpService:JSONEncode(payload)
    end)

    if not success then
        warn("OceanForge: Failed to serialize data payload.")
        return
    end

    if not requestLib then
        warn("OceanForge: HTTP request executor function not found!")
        if lastConnectionStatus ~= false then
            lastConnectionStatus = false
            sendNotification("🔴 KẾT NỐI THẤT BẠI", "Executor của bạn không hỗ trợ hàm gửi HTTP Request!", 7)
        end
        return
    end

    task.spawn(function()
        LedIndicator.BackgroundColor3 = Color3.fromRGB(249, 115, 22) -- Orange syncing
        
        local serverUrl = env.OceanForgeServerUrl or _G.OceanForgeServerUrl or "http://localhost:5000"

        if apiKey == "" or apiKey == "YOUR_API_KEY_HERE" then
            LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
            LedLabel.Text = "STATUS: THIẾU API KEY ⚠️ | 🛡️ ANTI-BAN"
            LedLabel.TextColor3 = Color3.fromRGB(245, 158, 11)
            
            if lastConnectionStatus ~= false then
                lastConnectionStatus = false
                sendNotification("⚠️ CHƯA NHẬP API KEY", "Vui lòng gõ /apikey trên Discord để lấy Key cá nhân!", 7)
            end
            return
        end

        -- Try syncing with Webhook Telemetry API first, fallback to /api/lua/update
        local successReq, response = pcall(requestLib, {
            Url = serverUrl .. "/api/webhook/roblox",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-api-key"] = apiKey
            },
            Body = jsonPayload
        })

        local statusCode = response and (response.StatusCode or response.status or response.status_code)
        if not (successReq and response and statusCode == 200) then
            -- Fallback endpoint
            successReq, response = pcall(requestLib, {
                Url = serverUrl .. "/api/lua/update",
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json",
                    ["x-api-key"] = apiKey
                },
                Body = jsonPayload
            })
            statusCode = response and (response.StatusCode or response.status or response.status_code)
        end

        if successReq and response and statusCode == 200 then
            LedIndicator.BackgroundColor3 = Color3.fromRGB(34, 197, 94) -- Emerald Green Success
            LedLabel.Text = "STATUS: KẾT NỐI DASHBOARD ✅"
            LedLabel.TextColor3 = Color3.fromRGB(74, 222, 128)

            if lastConnectionStatus ~= true then
                lastConnectionStatus = true
                sendNotification("🟢 CRIMSONFORGE ENGINE", "Đã kết nối thành công tới Dashboard!", 6)
            end
            print("OceanForge: Synchronized stats successfully.")
        else
            LedIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68) -- Neon Red Failure
            LedLabel.Text = "STATUS: KẾT NỐI THẤT BẠI ❌"
            LedLabel.TextColor3 = Color3.fromRGB(239, 68, 68)

            local errMsg = "unknown"
            if not successReq then
                errMsg = tostring(response)
            elseif response then
                errMsg = tostring(statusCode or "unknown")
            end

            if lastConnectionStatus ~= false then
                lastConnectionStatus = false
                sendNotification("🔴 KẾT NỐI THẤT BẠI", "Không thể kết nối Dashboard (Mã lỗi: " .. errMsg .. ")", 8)
            end
            warn("OceanForge: Synchronization failed. Status: " .. errMsg)
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
