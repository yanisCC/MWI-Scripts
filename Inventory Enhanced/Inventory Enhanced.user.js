// ==UserScript==
// @name         [MWI] Inventory Enhanced
// @name:zh-CN   [银河奶牛]仓库增强
// @namespace    http://tampermonkey.net/
// @version      00.1.0
// @description  // TODO
// @description:zh-CN  提供自定义物品分组功能，支持分组管理、物品分类和折叠显示
// @icon         https://www.milkywayidle.com/favicon.svg
// @author       Yannis
// @license      CC-BY-NC-SA-4.0
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @match        https://*/MWICombatSimulatorTest/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    // 存储键值常量配置
    const STORAGE_KEYS = {
        // 主存储键
        MAIN_STORAGE_KEY: 'mwi_inventory_enhanced_data',
        // 数据字段名
        FIELDS: {
            SHARED_CONFIG_ENABLED: 'shared_config_enabled',
            GROUPS: 'groups',
            ITEM_GROUPS: 'item_groups'
        },
        // 用户标识
        USER_TYPES: {
            SHARED: 'shared'
        }
    };

    /**
     * 获取完整的存储数据
     * @returns {Object} 完整的存储数据对象
     */
    function getAllStorageData() {
        const data = localStorage.getItem(STORAGE_KEYS.MAIN_STORAGE_KEY);
        if (!data) {
            // 初始化默认数据结构
            setAllStorageData({});
            return {};
        }
        return JSON.parse(data);
    }

    /**
     * 保存完整的存储数据
     * @param {Object} data - 要保存的完整数据对象
     */
    function setAllStorageData(data) {
        localStorage.setItem(STORAGE_KEYS.MAIN_STORAGE_KEY, JSON.stringify(data));
    }

    /**
     * 获取用户标识
     * @param {boolean} isShared - 是否为共享配置
     * @param {string} characterName - 角色名（可选）
     * @returns {string} 用户标识
     */
    function getUserKey(isShared = false, characterName = null) {
        return isShared ? STORAGE_KEYS.USER_TYPES.SHARED : (characterName || getCharacterName());
    }

    /**
     * 获取当前角色名
     * @returns {string|null} 角色名称，如果未找到则返回null
     */
    function getCharacterName() {
        const headerInfo = document.querySelector('.Header_info__26fkk');
        if (!headerInfo) return null;
        const nameElement = headerInfo.querySelector('.CharacterName_name__1amXp');
        return nameElement ? nameElement.textContent.trim() : null;
    }

    /**
     * 检查是否启用共享配置
     * @returns {boolean} 是否启用共享配置
     */
    function isSharedConfigEnabled() {
        const data = getAllStorageData();
        return data[STORAGE_KEYS.FIELDS.SHARED_CONFIG_ENABLED] === true;
    }

    /**
     * 设置共享配置状态
     * @param {boolean} enabled - 是否启用共享配置
     */
    function setSharedConfigEnabled(enabled) {
        const data = getAllStorageData();
        data[STORAGE_KEYS.FIELDS.SHARED_CONFIG_ENABLED] = enabled;
        setAllStorageData(data);
    }

    /**
     * 加载自定义分组
     * @returns {Array} 自定义分组数组
     */
    function loadCustomGroups() {
        const isShared = isSharedConfigEnabled();
        const data = getAllStorageData();
        const userKey = getUserKey(isShared);

        // 确保groups字段存在
        if (!data[STORAGE_KEYS.FIELDS.GROUPS]) {
            data[STORAGE_KEYS.FIELDS.GROUPS] = {};
        }

        return data[STORAGE_KEYS.FIELDS.GROUPS][userKey] || [];
    }

    /**
     * 保存自定义分组
     * @param {Array} groups - 分组数组
     */
    function saveCustomGroups(groups) {
        const isShared = isSharedConfigEnabled();
        const data = getAllStorageData();
        const userKey = getUserKey(isShared);

        // 确保groups字段存在
        if (!data[STORAGE_KEYS.FIELDS.GROUPS]) {
            data[STORAGE_KEYS.FIELDS.GROUPS] = {};
        }

        data[STORAGE_KEYS.FIELDS.GROUPS][userKey] = groups;
        setAllStorageData(data);
    }

    /**
     * 加载物品分组关联
     * @returns {Object} 物品分组关联对象，键为物品名，值为分组ID数组
     */
    function loadGroupItems() {
        const isShared = isSharedConfigEnabled();
        const data = getAllStorageData();
        const userKey = getUserKey(isShared);

        // 确保item_groups字段存在
        if (!data[STORAGE_KEYS.FIELDS.ITEM_GROUPS]) {
            data[STORAGE_KEYS.FIELDS.ITEM_GROUPS] = {};
        }

        return data[STORAGE_KEYS.FIELDS.ITEM_GROUPS][userKey] || {};
    }

    /**
     * 保存物品分组关联
     * @param {Object} itemGroups - 物品分组关联对象
     */
    function saveItemGroups(itemGroups) {
        const isShared = isSharedConfigEnabled();
        const data = getAllStorageData();
        const userKey = getUserKey(isShared);

        // 确保item_groups字段存在
        if (!data[STORAGE_KEYS.FIELDS.ITEM_GROUPS]) {
            data[STORAGE_KEYS.FIELDS.ITEM_GROUPS] = {};
        }

        data[STORAGE_KEYS.FIELDS.ITEM_GROUPS][userKey] = itemGroups;
        setAllStorageData(data);
    }

    /**
     * 创建分组管理界面
     * 显示一个模态对话框，允许用户管理自定义分组
     */
    function createGroupManagementUI() {
        // 检查是否已存在管理界面
        if (document.querySelector('#MWI_IE_Group_Management_UIPannel')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'MWI_IE_Group_Management_UIPannel';

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            width: 400px;
            max-height: 500px;
            overflow-y: auto;
            color: white;
        `;

        const title = document.createElement('h3');
        title.textContent = '管理物品分组页签';
        title.style.cssText = 'margin: 0 0 15px 0; text-align: center;';

        // 添加共享配置开关
        const sharedConfigContainer = document.createElement('div');
        sharedConfigContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #555;
            border-radius: 4px;
        `;

        const sharedConfigLabel = document.createElement('span');
        sharedConfigLabel.textContent = '共享配置';
        sharedConfigLabel.style.cssText = 'color: white; flex: 1;';

        const sharedConfigToggle = document.createElement('div');
        const isSharedEnabled = isSharedConfigEnabled();
        sharedConfigToggle.style.cssText = `
            position: relative;
            width: 50px;
            height: 24px;
            background: ${isSharedEnabled ? 'var(--color-primary)' : '#666'};
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.3s;
        `;

        const toggleSlider = document.createElement('div');
        toggleSlider.style.cssText = `
            position: absolute;
            top: 2px;
            left: ${isSharedEnabled ? '26px' : '2px'};
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: left 0.3s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        sharedConfigToggle.appendChild(toggleSlider);

        sharedConfigToggle.addEventListener('click', () => {
            const currentState = isSharedConfigEnabled();
            const newState = !currentState;
            setSharedConfigEnabled(newState);

            sharedConfigToggle.style.background = newState ? 'var(--color-primary)' : '#666';
            toggleSlider.style.left = newState ? '26px' : '2px';

            // 刷新分类列表以反映新的配置状态
            setTimeout(() => {
                overlay.remove();
                createGroupManagementUI();
                refreshInventoryGroups();
            }, 100);
        });

        sharedConfigContainer.appendChild(sharedConfigLabel);
        sharedConfigContainer.appendChild(sharedConfigToggle);

        const groupsList = document.createElement('div');
        groupsList.id = 'MWI_IE_Groupsist';

        const addGroupContainer = document.createElement('div');
        addGroupContainer.style.cssText = 'margin: 15px 0; display: flex; gap: 10px;';

        const newGroupInput = document.createElement('input');
        newGroupInput.type = 'text';
        newGroupInput.placeholder = '输入新分组名称';
        newGroupInput.style.cssText = `
            flex: 1;
            padding: 8px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #333;
            color: white;
        `;

        const addButton = document.createElement('button');
        addButton.textContent = '添加';
        addButton.style.cssText = `
            padding: 8px 15px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 15px;
        `;

        /**
         * 渲染分组列表
         * 在管理界面中显示所有自定义分组
         */
        function renderGroups() {
            const groups = loadCustomGroups();
            groupsList.innerHTML = '';

            groups.forEach((group, index) => {
                const groupItem = document.createElement('div');
                groupItem.draggable = true;
                groupItem.dataset.groupIndex = index;
                groupItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    margin-bottom: 8px;
                    cursor: move;
                    transition: all 0.3s ease;
                    user-select: none;
                `;

                // 添加拖拽事件监听器
                groupItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index);
                    groupItem.style.opacity = '0.5';
                    groupItem.classList.add('dragging');
                });

                groupItem.addEventListener('dragend', () => {
                    groupItem.style.opacity = '1';
                    groupItem.classList.remove('dragging');
                    // 清除所有其他项的动画效果
                    const allItems = groupsList.querySelectorAll('[data-group-index]');
                    allItems.forEach(item => {
                        item.style.transform = 'translateY(0)';
                        item.style.borderColor = '#555';
                        item.classList.remove('drop-target');
                    });
                });

                groupItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (groupItem.classList.contains('dragging')) return;

                    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const targetIndex = parseInt(groupItem.dataset.groupIndex);

                    // 高亮当前目标
                    groupItem.style.borderColor = 'var(--color-primary)';
                    groupItem.style.background = 'rgba(74, 158, 255, 0.1)';
                    groupItem.classList.add('drop-target');

                    // 为其他项添加滑动效果
                    const allItems = groupsList.querySelectorAll('[data-group-index]');
                    allItems.forEach(item => {
                        const itemIndex = parseInt(item.dataset.groupIndex);
                        if (item.classList.contains('dragging')) return;

                        if (draggedIndex < targetIndex && itemIndex > draggedIndex && itemIndex <= targetIndex) {
                            // 向上移动
                            item.style.transform = 'translateY(-10px)';
                        } else if (draggedIndex > targetIndex && itemIndex < draggedIndex && itemIndex >= targetIndex) {
                            // 向下移动
                            item.style.transform = 'translateY(10px)';
                        } else {
                            item.style.transform = 'translateY(0)';
                        }
                    });
                });

                groupItem.addEventListener('dragleave', (e) => {
                    // 检查是否真的离开了元素
                    if (!groupItem.contains(e.relatedTarget)) {
                        groupItem.style.borderColor = '#555';
                        groupItem.style.background = 'transparent';
                        groupItem.classList.remove('drop-target');
                    }
                });

                groupItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const targetIndex = parseInt(groupItem.dataset.groupIndex);

                    if (draggedIndex !== targetIndex) {
                        const groups = loadCustomGroups();
                        const draggedItem = groups.splice(draggedIndex, 1)[0];
                        groups.splice(targetIndex, 0, draggedItem);
                        saveCustomGroups(groups);
                        renderGroups();
                        refreshInventoryGroups();
                    }

                    // 清除所有动画效果
                    const allItems = groupsList.querySelectorAll('[data-group-index]');
                    allItems.forEach(item => {
                        item.style.transform = 'translateY(0)';
                        item.style.borderColor = '#555';
                        item.style.background = 'transparent';
                        item.classList.remove('drop-target');
                    });
                });

                const nameSpan = document.createElement('span');
                nameSpan.textContent = group.name;
                nameSpan.style.flex = '1';

                const renameButton = document.createElement('button');
                renameButton.textContent = '重命名';
                renameButton.style.cssText = `
                    padding: 4px 8px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                `;

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '删除';
                deleteButton.style.cssText = `
                    padding: 4px 8px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                `;

                // 重命名事件
                renameButton.addEventListener('click', () => {
                    const newName = prompt('输入新的分组名称:', group.name);
                    if (newName && newName.trim() && newName !== group.name) {
                        const groups = loadCustomGroups();
                        groups[index].name = newName.trim();
                        saveCustomGroups(groups);
                        renderGroups();
                        refreshInventoryGroups();
                    }
                });

                // 删除事件
                deleteButton.addEventListener('click', () => {
                    if (confirm(`确定要删除分组 "${group.name}" 吗？`)) {
                        // 先将属于该分组的物品移动回原始位置
                        const itemGroups = loadGroupItems();
                        const customGroupContainer = document.querySelector(`#MWI_IE_Custom_Group-${group.id}`);

                        if (customGroupContainer) {
                            const groupGrid = customGroupContainer.querySelector('.Inventory_itemGrid__20YAH');
                            if (groupGrid) {
                                const items = groupGrid.querySelectorAll('.Item_itemContainer__x7kH1');
                                items.forEach(item => {
                                    // 获取物品名称
                                    const itemSvg = item.querySelector('svg[aria-label]');
                                    if (itemSvg) {
                                        const itemName = itemSvg.getAttribute('aria-label');

                                        // 查找原始分组并移动物品
                                        const originalGroupSpan = [...document.querySelectorAll('.Inventory_categoryButton__35s1x')]
                                            .find(span => {
                                                const spanText = span.textContent.trim();
                                                // 排除自定义分组，查找原始分组
                                                return spanText !== group.name &&
                                                    !span.closest('[id^="MWI_IE_Custom_Group-"]');
                                            });

                                        if (originalGroupSpan) {
                                            const originalGroupGrid = originalGroupSpan.closest('.Inventory_itemGrid__20YAH');
                                            if (originalGroupGrid) {
                                                originalGroupGrid.appendChild(item);
                                            }
                                        } else {
                                            // 如果找不到原始分组，移动到第一个非自定义分组
                                            const firstOriginalGroup = document.querySelector('.Inventory_items__6SXv0 > div:not([id^="MWI_IE_Custom_Group-"]) .Inventory_itemGrid__20YAH');
                                            if (firstOriginalGroup) {
                                                firstOriginalGroup.appendChild(item);
                                            }
                                        }
                                    }
                                });
                            }
                        }

                        const groups = loadCustomGroups();
                        groups.splice(index, 1);
                        saveCustomGroups(groups);

                        // 清理物品关联
                        Object.keys(itemGroups).forEach(itemName => {
                            itemGroups[itemName] = itemGroups[itemName].filter(groupId => groupId !== group.id);
                            if (itemGroups[itemName].length === 0) {
                                delete itemGroups[itemName];
                            }
                        });
                        saveItemGroups(itemGroups);

                        renderGroups();
                        refreshInventoryGroups();
                    }
                });

                groupItem.appendChild(nameSpan);
                groupItem.appendChild(renameButton);
                groupItem.appendChild(deleteButton);
                groupsList.appendChild(groupItem);
            });
        }

        // 添加分组事件
        addButton.addEventListener('click', () => {
            const name = newGroupInput.value.trim();
            if (name) {
                const groups = loadCustomGroups();
                const newGroup = {
                    id: Date.now().toString(),
                    name: name
                };
                groups.push(newGroup);
                saveCustomGroups(groups);
                newGroupInput.value = '';
                renderGroups();
                refreshInventoryGroups();
            }
        });

        // 回车添加分组
        newGroupInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addButton.click();
            }
        });

        // 关闭事件
        closeButton.addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        modal.appendChild(title);
        modal.appendChild(sharedConfigContainer);
        modal.appendChild(addGroupContainer);
        modal.appendChild(groupsList);
        addGroupContainer.appendChild(newGroupInput);
        addGroupContainer.appendChild(addButton);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        renderGroups();
    }

    /**
     * 创建自定义分组页签
     * 在仓库界面中创建和显示自定义分组
     */
    function createCustomGroups() {
        const inventoryContainer = document.querySelector('.Inventory_items__6SXv0');
        if (!inventoryContainer) return;

        const groups = loadCustomGroups();
        const groupItems = loadGroupItems();
        // 反向遍历分组数组以保持正确的显示顺序
        for (let i = groups.length - 1; i >= 0; i--) {
            const group = groups[i];
            let customGroup = inventoryContainer.querySelector(`#MWI_IE_Custom_Group-${group.id}`);

            // 收集属于此分组的物品
            const groupItemsList = [];
            Object.keys(groupItems).forEach(itemName => {
                if (groupItems[itemName] && groupItems[itemName].includes(group.id)) {
                    const inventoryItemSvg = document.querySelector(`.Inventory_items__6SXv0 .Item_itemContainer__x7kH1 svg[aria-label="${itemName}"]`);
                    if (inventoryItemSvg) {
                        // 获取原始物品容器
                        const originalItemContainer = inventoryItemSvg.closest('.Item_itemContainer__x7kH1');
                        if (originalItemContainer) {
                            if (!originalItemContainer._originalItemGrid) {
                                originalItemContainer._originalItemGrid = originalItemContainer.closest('.Inventory_itemGrid__20YAH');
                            }
                            // // 检查物品是否已经在正确的分组中
                            // const currentParent = originalItemContainer.closest('[id^="MWI_IE_Custom_Group-"]');
                            // if (!currentParent || currentParent.id !== `MWI_IE_Custom_Group-${group.id}`) {
                            // }
                            groupItemsList.push(originalItemContainer);
                        }
                    }
                }
            });

            // 如果没有道具，保持分组显示但为空
            if (groupItemsList.length === 0) {
                if (customGroup) {
                    customGroup.style.display = 'none';
                }
                continue;
            }

            if (!customGroup) {
                // 创建新分组
                customGroup = document.createElement('div');
                customGroup.id = `MWI_IE_Custom_Group-${group.id}`;
                customGroup.innerHTML = `
                     <div class="Inventory_itemGrid__20YAH">
                         <div class="Inventory_label__XEOAx">
                             <span class="Inventory_categoryButton__35s1x" style="cursor: pointer;">${group.name}</span>
                         </div>
                     </div>
                 `;

                // 将自定义分组添加到仓库的最前面
                inventoryContainer.insertBefore(customGroup, inventoryContainer.firstChild);
            } else {
                // 如果分组已存在且有道具，显示它并更新内容
                customGroup.style.display = 'block';
            }

            // 添加属于此分组的物品
            const groupGrid = customGroup.querySelector('.Inventory_itemGrid__20YAH');
            const groupButton = groupGrid.querySelector('.Inventory_categoryButton__35s1x');

            // 移动物品到新分组
            groupItemsList.forEach(item => {
                groupGrid.appendChild(item);
            });

            // 添加折叠功能
            let isCollapsed = false;
            groupButton.addEventListener('click', () => {
                isCollapsed = !isCollapsed;
                if (isCollapsed) {
                    // 折叠：隐藏当前分组中的所有物品
                    const currentItems = groupGrid.querySelectorAll('.Item_itemContainer__x7kH1');
                    currentItems.forEach(item => {
                        item.style.display = 'none';
                    });
                    groupButton.textContent = `+ ${group.name} (${currentItems.length})`;
                } else {
                    // 展开：显示当前分组中的所有物品
                    const currentItems = groupGrid.querySelectorAll('.Item_itemContainer__x7kH1');
                    currentItems.forEach(item => {
                        item.style.display = 'block';
                    });
                    groupButton.textContent = `${group.name}`;
                }
            });
        }
    }

    /**
     * 创建管理分组按钮
     * 在仓库界面中添加管理分组的按钮
     * @param {HTMLElement} itemsGrid - 物品网格容器
     */
    function createGroupManagementButton(itemsGrid) {
        if (!itemsGrid) return;

        if (itemsGrid.parentElement.querySelector('.MWI_IE_Group_Management_Div')) return;

        // const itemsContainer
        // let itemFilter = document.querySelector('.MainPanel_mainPanel__Ex2Ir .Inventory_itemGrid__20YAH');
        // if (!itemFilter) {
        //     itemFilter = document.querySelector('.Inventory_inventory__17CH2 .Inventory_itemGrid__20YAH');
        //     if (!itemFilter) return;
        // }

        // const itemsInventoryContainer = itemsGrid.querySelector('.Inventory_items__6SXv0');
        // if (!itemsInventoryContainer) return;

        const managementDiv = document.createElement('div');
        managementDiv.className = 'MWI_IE_Group_Management_Div';
        managementDiv.style.cssText = `
            text-align: left;
        `;
        itemsGrid.parentElement.insertBefore(managementDiv, itemsGrid.parentElement.firstChild);

        const managementButton = document.createElement('button');
        managementButton.id = 'MWI_IE_Group_Management_Btn';
        managementButton.textContent = '管理物品分组页签';
        managementButton.style.cssText = `
            padding: 8px 16px;
            background: var(--color-primary);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
            width: auto;
            font-weight: 500;
            display: inline-block;
            min-width: auto;
            max-width: none;
            box-sizing: border-box;
        `;

        managementButton.addEventListener('mouseenter', () => {
            managementButton.style.background = 'var(--color-primary-hover, #4a9eff)';
        });
        managementButton.addEventListener('mouseleave', () => {
            managementButton.style.background = 'var(--color-primary)';
        });

        managementButton.addEventListener('click', createGroupManagementUI);
        managementDiv.appendChild(managementButton);
    }

    /**
     * 添加物品分组按钮
     * 在物品右键菜单中添加分组按钮
     * @param {HTMLElement} menuContainer - 菜单容器
     */
    function addItemGroupButton(menuContainer) {
        // 检查是否已存在分组按钮
        const existingButton = menuContainer.querySelector('.MWI_IE_Group_Btn');
        if (existingButton) return;

        const groupButton = document.createElement('button');
        groupButton.className = 'Button_button__1Fe9z Button_fullWidth__17pVU MWI_IE_Group_Btn';
        groupButton.textContent = '物品分组';

        groupButton.addEventListener('click', function () {
            const itemName = menuContainer.querySelector('.Item_name__2C42x').textContent.trim();
            showItemGroupDialog(itemName);
        });

        menuContainer.appendChild(groupButton);
    }

    /**
     * 显示物品分组对话框
     * 显示一个对话框，允许用户为指定物品选择分组
     * @param {string} itemName - 物品名称
     */
    function showItemGroupDialog(itemName) {
        // 检查是否已存在对话框
        if (document.querySelector('#MWI_IE_Item_Group_Dialog')) return;

        const overlay = document.createElement('div');
        overlay.id = 'MWI_IE_Item_Group_Dialog';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #2a2a2a;
            border-radius: 8px;
            padding: 20px;
            width: 350px;
            max-height: 400px;
            overflow-y: auto;
            color: white;
        `;

        const title = document.createElement('h3');
        title.textContent = `物品分组: ${itemName}`;
        title.style.cssText = 'margin: 0 0 15px 0; text-align: center; font-size: 16px;';

        const groupsList = document.createElement('div');
        const groups = loadCustomGroups();
        const itemGroups = loadGroupItems();
        const currentItemGroups = itemGroups[itemName] || [];

        groups.forEach(group => {
            const groupItem = document.createElement('div');
            const isSelected = currentItemGroups.includes(group.id);

            groupItem.style.cssText = `
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 8px;
                  border: ${isSelected ? '2px solid white' : '1px solid #555'};
                  border-radius: 4px;
                  margin-bottom: 8px;
                  background: ${isSelected ? 'var(--color-primary)' : 'transparent'};
                  cursor: pointer;
                  transition: all 0.2s;
              `;

            // 添加hover效果
            groupItem.addEventListener('mouseenter', () => {
                if (!currentItemGroups.includes(group.id)) {
                    groupItem.style.background = 'rgba(74, 158, 255, 0.3)';
                }
            });
            groupItem.addEventListener('mouseleave', () => {
                if (!currentItemGroups.includes(group.id)) {
                    groupItem.style.background = isSelected ? 'var(--color-primary)' : 'transparent';
                }
            });

            const label = document.createElement('span');
            label.textContent = group.name;
            label.style.cssText = `
                 flex: 1;
                 color: ${isSelected ? 'var(--color-text-dark-mode)' : 'white'};
                 font-weight: ${isSelected ? 'bold' : 'normal'};
             `;

            groupItem.appendChild(label);
            groupsList.appendChild(groupItem);

            // 点击切换选择状态（单选模式）
            groupItem.addEventListener('click', () => {
                const itemGroups = loadGroupItems();
                // 重新获取当前物品的分组状态，确保数据一致性
                const updatedCurrentItemGroups = itemGroups[itemName] || [];
                const isCurrentlySelected = updatedCurrentItemGroups.includes(group.id);

                if (isCurrentlySelected) {
                    // 如果当前分组已选中，则取消选择
                    // 将物品从当前分组移除，但保留空数组以便后续处理
                    itemGroups[itemName] = [];

                    // 手动将物品移回原始位置
                    const inventoryItem = document.querySelector(`.Inventory_items__6SXv0 .Item_itemContainer__x7kH1 svg[aria-label="${itemName}"]`);
                    if (inventoryItem) {
                        const itemContainer = inventoryItem.closest('.Item_itemContainer__x7kH1');
                        if (itemContainer) {
                            const originalItemGrid = itemContainer._originalItemGrid;
                            originalItemGrid.appendChild(itemContainer);
                        }
                    }

                    // 更新UI：重置所有分组项的样式
                    groupsList.querySelectorAll('div').forEach(item => {
                        const itemLabel = item.querySelector('span');
                        item.style.background = 'transparent';
                        item.style.border = '1px solid #555';
                        if (itemLabel) {
                            itemLabel.style.color = 'white';
                            itemLabel.style.fontWeight = 'normal';
                        }
                    });
                } else {
                    // 单选模式：清除所有其他选择，只选择当前分组
                    itemGroups[itemName] = [group.id];

                    // 更新UI：重置所有分组项的样式
                    groupsList.querySelectorAll('div').forEach(item => {
                        const itemLabel = item.querySelector('span');
                        item.style.background = 'transparent';
                        item.style.border = '1px solid #555';
                        if (itemLabel) {
                            itemLabel.style.color = 'white';
                            itemLabel.style.fontWeight = 'normal';
                        }
                    });

                    // 设置当前选中项的样式
                    groupItem.style.background = 'var(--color-primary)';
                    groupItem.style.border = '2px solid white';
                    label.style.color = 'var(--color-text-dark-mode)';
                    label.style.fontWeight = 'bold';
                }

                // 清理空数组
                Object.keys(itemGroups).forEach(key => {
                    if (itemGroups[key].length === 0) {
                        delete itemGroups[key];
                    }
                });

                saveItemGroups(itemGroups);

                // 立即刷新分组显示
                refreshInventoryGroups();
            });
        });

        const closeButton = document.createElement('button');
        closeButton.textContent = '完成';
        closeButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: var(--color-primary);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 15px;
            transition: background 0.2s;
            font-weight: bold;
        `;

        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'var(--color-primary-hover, #4a9eff)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'var(--color-primary)';
        });
        closeButton.addEventListener('click', () => {
            overlay.remove();
            refreshInventoryGroups();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                refreshInventoryGroups();
            }
        });

        modal.appendChild(title);
        modal.appendChild(groupsList);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    /**
     * 刷新仓库分组显示
     * 移除所有现有的自定义分组并重新创建
     */
    function refreshInventoryGroups() {
        console.log('开始刷新仓库分组显示');

        // 移除所有自定义分组
        const customGroups = document.querySelectorAll('[id^="MWI_IE_Custom_Group-"]');
        console.log('找到自定义分组数量:', customGroups.length);
        customGroups.forEach(group => group.remove());

        // 重新创建自定义分组
        createCustomGroups();

        console.log('仓库分组显示刷新完成');
    }

    /**
     * 主刷新函数
     * 检测页面状态并初始化相应的功能
     */
    function refresh() {
        try {
            // 仓库页面检测
            const inventoryContainer = document.querySelector('.Inventory_items__6SXv0');
            if (inventoryContainer) {
                let itemFilter = document.querySelector('.GamePage_middlePanel__uDts7 .Inventory_itemGrid__20YAH');
                if (itemFilter) {
                    createGroupManagementButton(itemFilter);
                }
                itemFilter = document.querySelector('.GamePage_characterManagementPanel__3OYQL .Inventory_itemGrid__20YAH');
                if (itemFilter) {
                    createGroupManagementButton(itemFilter);
                }
                createCustomGroups();
            }

            // 检查是否出现物品菜单
            const itemMenu = document.querySelector('.Item_actionMenu__2yUcG');
            if (itemMenu) {
                addItemGroupButton(itemMenu);
            }
        } catch (error) {
            console.log('刷新函数出错:', error);
        }
    }

    /**
     * 设置MutationObserver监听DOM变化
     * 当页面DOM发生变化时自动刷新功能
     */
    let refreshTimeout;
    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver(function (mutationsList, observer) {
        // 防抖处理，避免频繁刷新
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
            refresh();
        }, 100);
    });
    observer.observe(document, config);

    /**
     * 页面加载完成后执行一次初始化
     * 确保在页面完全加载后启动功能
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
    } else {
        refresh();
    }

})();