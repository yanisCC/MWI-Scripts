// ==UserScript==
// @name         [MWI] Real-time Import Of Battle Simulation
// @name:zh-CN   [银河奶牛]战斗模拟实时导入
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Battle simulation imports the real-time configuration of the current character.
// @description:zh-CN  战斗模拟导入当前角色实时配置
// @icon         https://www.milkywayidle.com/favicon.svg
// @author       Yannis
// @license      MIT
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @match        https://shykai.github.io/mwisim.github.io/*
// @match        https://shykai.github.io/MWICombatSimulatorTest/dist/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==
 
 
(function () {
    'use strict';
 
    let playerId;
    let clientData = {};
 
    hookWS();
 
    function hookWS() {
        const dataProperty = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data");
        const oriGet = dataProperty.get;
 
        dataProperty.get = hookedGet;
        Object.defineProperty(MessageEvent.prototype, "data", dataProperty);
 
        function hookedGet() {
            const socket = this.currentTarget;
            if (!(socket instanceof WebSocket)) {
                return oriGet.call(this);
            }
            if (socket.url.indexOf("api.milkywayidle.com/ws") <= -1 && socket.url.indexOf("api-test.milkywayidle.com/ws") <= -1) {
                return oriGet.call(this);
            }
 
            const message = oriGet.call(this);
            Object.defineProperty(this, "data", { value: message }); // Anti-loop
 
            return handleMessage(message);
        }
    }
 
    function getInitClientData() {
        return JSON.parse(GM_getValue("init_client_data", ""));
    }
 
    function getCurrentPlayerData() {
        let playersDataStr = GM_getValue("init_character_data", "");
        if (playersDataStr) {
            let playerData = JSON.parse(playersDataStr);
            return getPlayerData(playerData.character.id);
        } else {
            return;
        }
    }
 
    function getPlayerData(id) {
        let playersDataStr = GM_getValue("mwi_players_data", null) || JSON.stringify(new Array());
        let playersData = JSON.parse(playersDataStr);
        const pIndex = playersData.findIndex(obj => obj.character.id === id);
        if (pIndex !== -1) {
            return playersData[pIndex];
        } else {
            return;
        }
    }
 
    function saveCharacterData(obj) {
        let playersDataStr = GM_getValue("mwi_players_data", null) || JSON.stringify(new Array());
        let playersData = JSON.parse(playersDataStr);
        playersData = playersData.filter(e => e.character.id !== obj.character.id);
        playersData.unshift(obj);
        if (playersData.length > 20) {
            playersData.pop();
        }
        GM_setValue("mwi_players_data", JSON.stringify(playersData));
    }
 
    function handleMessage(message) {
        let obj = JSON.parse(message);
        if (!obj) {
            return;
        }
        switch (obj.type) {
            case 'pong': {
                // ping-pong
                break;
            }
            case 'init_character_data': {
                GM_setValue("init_character_data", message);
                // 角色Id
                playerId = obj.character.id;
                // 战斗模拟数据
                obj.battleObj = buildBattleObjFromInitData(obj);
                // 初始化信息
                saveCharacterData(obj);
                break;
            }
            case 'init_client_data': {
                // 客户端数据
                GM_setValue("init_client_data", message);
                clientData.actionDetailMap = obj.actionDetailMap;
                clientData.levelExperienceTable = obj.levelExperienceTable;
                clientData.itemDetailMap = obj.itemDetailMap;
                clientData.actionCategoryDetailMap = obj.actionCategoryDetailMap;
                clientData.abilityDetailMap = obj.abilityDetailMap;
                break;
            }
            case 'active_player_count_updated': {
                // 活跃人数变更
                break;
            }
            case 'combat_triggers_updated': {
                // Trigger变更
                break;
            }
            case 'items_updated': {
                // 物品变更
                console.log(obj)
                let player = getPlayerData(playerId);
                if (obj.endCharacterItems) {
                    for (const item of Object.values(obj.endCharacterItems)) {
                        if (item.itemLocationHrid !== "/item_locations/inventory") {
                            // 装备变更
                            let equipment = player.battleObj.player.equipment;
                            equipment = equipment.filter(e => e.itemLocationHrid !== item.itemLocationHrid);
                            equipment.push({
                                itemLocationHrid: item.itemLocationHrid,
                                itemHrid: item.itemHrid,
                                enhancementLevel: item.enhancementLevel,
                            })
                            player.battleObj.player.equipment = equipment;
                            saveCharacterData(player);
                        }
                    }
                }
                break;
            }
            case 'profile_shared': {
                // 角色详情
                break;
            }
            case 'chat_message_received': {
                // 聊天消息
                break;
            }
            case 'party_update': {
                // 队伍更新
                let player = getPlayerData(playerId);
                player.partyInfo = obj.partyInfo;
                saveCharacterData(player);
                break;
            }
            case 'action_completed': {
                // 行动完成
                break;
            }
            case 'action_type_consumable_slots_updated': {
                // 行动消耗变更
                break;
            }
            default: {
                console.log(obj)
            }
        }
    }
 
    // 添加实时导入按钮
    function addImportButtonForMWICombatSimulate() {
        const checkElem = () => {
            const btnImport = document.querySelector(`button#buttonImportExport`);
            if (btnImport) {
                clearInterval(timer);
 
                let divRow = document.createElement("div");
                divRow.className = "row";
                btnImport.parentElement.parentElement.append(divRow);
 
                // 导入按钮
                let div1 = document.createElement("div");
                div1.className = "col-md-auto mb-2 pt-3";
                divRow.append(div1);
                let button = document.createElement("button");
                div1.append(button);
                button.textContent = "实时导入数据";
                button.className = "btn btn-warning";
                button.onclick = function () {
                    const btnGetPrice = document.querySelector(`button#buttonGetPrices`);
                    if (btnGetPrice) {
                        btnGetPrice.click();
                    }
                    importDataForMWICombatSimulate(button);
                    return false;
                };
            }
        };
        let timer = setInterval(checkElem, 200);
    }
 
    // 导入数据
    async function importDataForMWICombatSimulate(button) {
        clientData = getInitClientData();
        let player = getCurrentPlayerData();
 
        const BLANK_PLAYER_JSON_STR = `{\"player\":{\"attackLevel\":1,\"magicLevel\":1,\"powerLevel\":1,\"rangedLevel\":1,\"defenseLevel\":1,\"staminaLevel\":1,\"intelligenceLevel\":1,\"equipment\":[]},\"food\":{\"/action_types/combat\":[{\"itemHrid\":\"\"},{\"itemHrid\":\"\"},{\"itemHrid\":\"\"}]},\"drinks\":{\"/action_types/combat\":[{\"itemHrid\":\"\"},{\"itemHrid\":\"\"},{\"itemHrid\":\"\"}]},\"abilities\":[{\"abilityHrid\":\"\",\"level\":\"1\"},{\"abilityHrid\":\"\",\"level\":\"1\"},{\"abilityHrid\":\"\",\"level\":\"1\"},{\"abilityHrid\":\"\",\"level\":\"1\"},{\"abilityHrid\":\"\",\"level\":\"1\"}],\"triggerMap\":{},\"zone\":\"/actions/combat/fly\",\"simulationTime\":\"100\",\"houseRooms\":{\"/house_rooms/dairy_barn\":0,\"/house_rooms/garden\":0,\"/house_rooms/log_shed\":0,\"/house_rooms/forge\":0,\"/house_rooms/workshop\":0,\"/house_rooms/sewing_parlor\":0,\"/house_rooms/kitchen\":0,\"/house_rooms/brewery\":0,\"/house_rooms/laboratory\":0,\"/house_rooms/observatory\":0,\"/house_rooms/dining_room\":0,\"/house_rooms/library\":0,\"/house_rooms/dojo\":0,\"/house_rooms/gym\":0,\"/house_rooms/armory\":0,\"/house_rooms/archery_range\":0,\"/house_rooms/mystical_study\":0}}`;
 
        const playerNames = {};
        const imported = {};
        const battleData = {};
        let isParty = false;
        let zone = "/actions/combat/fly";
        let isZoneDungeon = false;
        
        if (!player?.partyInfo?.partySlotMap) {
            // 个人
            playerNames[0] = player.character.name;
            imported[0] = true;
            battleData[0] = player.battleObj;
            // Zone
            for (const action of player.characterActions) {
                if (action && action.actionHrid.includes("/actions/combat/")) {
                    zone = action.actionHrid;
                    isZoneDungeon = clientData.actionDetailMap[action.actionHrid]?.combatZoneInfo?.isDungeon;
                    break;
                }
            }
        } else {
            // 队伍
            isParty = true;
            let i = 0;
            for (const member of Object.values(player.partyInfo.partySlotMap)) {
                i++;
                if (member.characterID) {
                    if (member.characterID === player.character.id) {
                        playerNames[i] = player.character.name;
                        imported[i] = true;
                        battleData[i] = JSON.stringify(player.battleObj);
                        continue;
                    } else {
                        let memberData = getPlayerData(member.characterID);
                        if (memberData) {
                            playerNames[i] = memberData.character.name;
                            imported[i] = true;
                            battleData[i] = JSON.stringify(memberData.battleObj);
                            continue;
                        } else {
                            playerNames[i] = "需要点开资料";
                            imported[i] = true;
                            battleData[i] = BLANK_PLAYER_JSON_STR;
                        }
                    }
                }
            }
            // Zone
            zone = player.partyInfo?.party?.actionHrid;
            isZoneDungeon = clientData.actionDetailMap[zone]?.combatZoneInfo?.isDungeon;
        }
 
        // Select zone or dungeon
        if (zone) {
            if (isZoneDungeon) {
                document.querySelector(`input#simDungeonToggle`).checked = true;
                document.querySelector(`input#simDungeonToggle`).dispatchEvent(new Event("change"));
                const selectDungeon = document.querySelector(`select#selectDungeon`);
                for (let i = 0; i < selectDungeon.options.length; i++) {
                    if (selectDungeon.options[i].value === zone) {
                        selectDungeon.options[i].selected = true;
                        break;
                    }
                }
            } else {
                document.querySelector(`input#simDungeonToggle`).checked = false;
                document.querySelector(`input#simDungeonToggle`).dispatchEvent(new Event("change"));
                const selectZone = document.querySelector(`select#selectZone`);
                for (let i = 0; i < selectZone.options.length; i++) {
                    if (selectZone.options[i].value === zone) {
                        selectZone.options[i].selected = true;
                        break;
                    }
                }
            }
        }
 
        for (let i = 1; i <= 5; i++) {
            if (!battleData[i]) {
                battleData[i] = BLANK_PLAYER_JSON_STR;
                playerNames[i] = `Player ${i}`;
                imported[i] = false;
            }
            document.querySelector(`a#player${i}-tab`).textContent = playerNames[i];
            if (document.querySelector(`input#player${i}.form-check-input.player-checkbox`)) {
                document.querySelector(`input#player${i}.form-check-input.player-checkbox`).checked = imported[i];
                document.querySelector(`input#player${i}.form-check-input.player-checkbox`).dispatchEvent(new Event("change"));
            }
        }
 
        document.querySelector(`a#group-combat-tab`).click();
        const editImport = document.querySelector(`input#inputSetGroupCombatAll`);
        editImport.value = JSON.stringify(battleData);
        document.querySelector(`button#buttonImportSet`).click();
 
        // 模拟时长
        document.querySelector(`input#inputSimulationTime`).value = 24;
 
        button.textContent = "成功导入数据";
        button.className = "btn btn-success";
        setTimeout(() => {
            button.textContent = "实时导入数据";
            button.className = "btn btn-warning";
        }, 1000);

        if (!isParty) {
            setTimeout(() => {
                document.querySelector(`button#buttonStartSimulation`).click();
            }, 500);
        }
    }
 
    async function observeResultsForMWICombatSimulate() {
        let resultDiv = document.querySelector(`div.row`)?.querySelectorAll(`div.col-md-5`)?.[2]?.querySelector(`div.row > div.col-md-5`);
        while (!resultDiv) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            resultDiv = document.querySelector(`div.row`)?.querySelectorAll(`div.col-md-5`)?.[2]?.querySelector(`div.row > div.col-md-5`);
        }
 
        const deathDiv = document.querySelector(`div#simulationResultPlayerDeaths`);
        const expDiv = document.querySelector(`div#simulationResultExperienceGain`);
        const consumeDiv = document.querySelector(`div#simulationResultConsumablesUsed`);
        deathDiv.style.backgroundColor = "#FFEAE9";
        deathDiv.style.color = "black";
        expDiv.style.backgroundColor = "#CDFFDD";
        expDiv.style.color = "black";
        consumeDiv.style.backgroundColor = "#F0F8FF";
        consumeDiv.style.color = "black";
 
        let div = document.createElement("div");
        div.id = "tillLevel";
        div.style.backgroundColor = "#FFFFE0";
        div.style.color = "black";
        div.textContent = "";
        resultDiv.append(div);
    }
 
    // 构建战斗模拟信息
    function buildBattleObjFromInitData(obj) {
        let battleObj = {};
        // Base
        battleObj.character = {}
        battleObj.character.id = obj.character.id;
        battleObj.character.name = obj.character.name;
        battleObj.character.gameMode = obj.character.gameMode;
        // Levels
        battleObj.player = {}
        for (const skill of obj.characterSkills) {
            if (skill.skillHrid.includes("stamina")) {
                battleObj.player.staminaLevel = skill.level;
            } else if (skill.skillHrid.includes("intelligence")) {
                battleObj.player.intelligenceLevel = skill.level;
            } else if (skill.skillHrid.includes("attack")) {
                battleObj.player.attackLevel = skill.level;
            } else if (skill.skillHrid.includes("power")) {
                battleObj.player.powerLevel = skill.level;
            } else if (skill.skillHrid.includes("defense")) {
                battleObj.player.defenseLevel = skill.level;
            } else if (skill.skillHrid.includes("ranged")) {
                battleObj.player.rangedLevel = skill.level;
            } else if (skill.skillHrid.includes("magic")) {
                battleObj.player.magicLevel = skill.level;
            }
        }
        // Equipments
        battleObj.player.equipment = [];
        for (const item of obj.characterItems) {
            if (!item.itemLocationHrid.includes("/item_locations/inventory")) {
                battleObj.player.equipment.push({
                    itemLocationHrid: item.itemLocationHrid,
                    itemHrid: item.itemHrid,
                    enhancementLevel: item.enhancementLevel,
                });
            }
        }
        // Food
        battleObj.food = {}
        battleObj.food["/action_types/combat"] = [];
        for (const food of obj.actionTypeFoodSlotsMap["/action_types/combat"]) {
            if (food) {
                battleObj.food["/action_types/combat"].push({
                    itemHrid: food.itemHrid,
                });
            } else {
                battleObj.food["/action_types/combat"].push({
                    itemHrid: "",
                });
            }
        }
        // Drinks
        battleObj.drinks = {}
        battleObj.drinks["/action_types/combat"] = [];
        for (const drink of obj.actionTypeDrinkSlotsMap["/action_types/combat"]) {
            if (drink) {
                battleObj.drinks["/action_types/combat"].push({
                    itemHrid: drink.itemHrid,
                });
            } else {
                battleObj.drinks["/action_types/combat"].push({
                    itemHrid: "",
                });
            }
        }
        // Abilities
        battleObj.abilities = [
            {
                abilityHrid: "",
                level: "1",
            },
            {
                abilityHrid: "",
                level: "1",
            },
            {
                abilityHrid: "",
                level: "1",
            },
            {
                abilityHrid: "",
                level: "1",
            },
            {
                abilityHrid: "",
                level: "1",
            },
        ];
        let normalAbillityIndex = 1;
        for (const ability of obj.combatUnit.combatAbilities) {
            if (ability && clientData.abilityDetailMap[ability.abilityHrid].isSpecialAbility) {
                battleObj.abilities[0] = {
                    abilityHrid: ability.abilityHrid,
                    level: ability.level,
                };
            } else if (ability) {
                battleObj.abilities[normalAbillityIndex++] = {
                    abilityHrid: ability.abilityHrid,
                    level: ability.level,
                };
            }
        }
        // TriggerMap
        battleObj.triggerMap = { ...obj.abilityCombatTriggersMap, ...obj.consumableCombatTriggersMap };
        // HouseRooms
        battleObj.houseRooms = {};
        for (const house of Object.values(obj.characterHouseRoomMap)) {
            battleObj.houseRooms[house.houseRoomHrid] = house.level;
        }
        return battleObj;
    }
 
    if (localStorage.getItem("initClientData")) {
        const obj = JSON.parse(localStorage.getItem("initClientData"));
        GM_setValue("init_client_data", localStorage.getItem("initClientData"));
 
        clientData.actionDetailMap = obj.actionDetailMap;
        clientData.levelExperienceTable = obj.levelExperienceTable;
        clientData.itemDetailMap = obj.itemDetailMap;
        clientData.actionCategoryDetailMap = obj.actionCategoryDetailMap;
        clientData.abilityDetailMap = obj.abilityDetailMap;
    }
 
    if (document.URL.includes("shykai.github.io/MWICombatSimulatorTest/")) {
        addImportButtonForMWICombatSimulate();
        observeResultsForMWICombatSimulate();
    }
 
})();