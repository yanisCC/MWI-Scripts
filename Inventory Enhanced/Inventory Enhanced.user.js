// ==UserScript==
// @name         [MWI] Inventory Enhanced
// @name:zh-CN   [银河奶牛]仓库增强
// @namespace    http://tampermonkey.net/
// @version      00.1.0
// @description  Enhanced inventory management with custom categories for MWI
// @description:zh-CN  银河奶牛仓库增强 - 自定义物品分类管理
// @icon         https://www.milkywayidle.com/favicon.svg
// @author       Yannis
// @license      CC-BY-NC-SA-4.0
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @match        https://*/MWICombatSimulatorTest/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      textdb.online
// @require      https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js
// ==/UserScript==

(function () {
    'use strict';

    // 获取当前角色名
    function getCharacterName() {
        const headerInfo = document.querySelector('.Header_info__26fkk');
        if (!headerInfo) return null;
        const nameElement = headerInfo.querySelector('.CharacterName_name__1amXp');
        return nameElement ? nameElement.textContent.trim() : null;
    }

    // 获取存储键名
    function getStorageKey(type) {
        const characterName = getCharacterName();
        if (!characterName) return null;
        return `mw_${type}_${characterName}`;
    }

    // 检查是否启用共享配置
    function isSharedConfigEnabled() {
        return localStorage.getItem('mwi_shared_config_enabled') === 'true';
    }

    // 设置共享配置状态
    function setSharedConfigEnabled(enabled) {
        localStorage.setItem('mwi_shared_config_enabled', enabled.toString());
    }

    // 加载自定义分类
    function loadCustomCategories() {
        const isShared = isSharedConfigEnabled();
        const storageKey = isShared ? 'mwi_custom_categories_shared' : getStorageKey('categories');
        if (!storageKey) return [];
        return JSON.parse(localStorage.getItem(storageKey)) || [];
    }

    // 保存自定义分类
    function saveCustomCategories(categories) {
        const isShared = isSharedConfigEnabled();
        const storageKey = isShared ? 'mwi_custom_categories_shared' : getStorageKey('categories');
        if (!storageKey) return;
        localStorage.setItem(storageKey, JSON.stringify(categories));
    }

    // 加载物品分类关联
    function loadItemCategories() {
        const isShared = isSharedConfigEnabled();
        const storageKey = isShared ? 'mwi_item_categories_shared' : getStorageKey('item_categories');
        if (!storageKey) return {};
        return JSON.parse(localStorage.getItem(storageKey)) || {};
    }

    // 保存物品分类关联
    function saveItemCategories(itemCategories) {
        const isShared = isSharedConfigEnabled();
        const storageKey = isShared ? 'mwi_item_categories_shared' : getStorageKey('item_categories');
        if (!storageKey) return;
        localStorage.setItem(storageKey, JSON.stringify(itemCategories));
    }

    // 创建分类管理界面
    function createCategoryManagementUI() {
        // 检查是否已存在管理界面
        if (document.querySelector('#MWI_IE_Category_Management_UIPannel')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'MWI_IE_Category_Management_UIPannel';

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
        title.textContent = '分类管理';
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
                createCategoryManagementUI();
                refreshInventoryCategories();
            }, 100);
        });

        sharedConfigContainer.appendChild(sharedConfigLabel);
        sharedConfigContainer.appendChild(sharedConfigToggle);

        const categoriesList = document.createElement('div');
        categoriesList.id = 'MWI_IE_Categoriesist';

        const addCategoryContainer = document.createElement('div');
        addCategoryContainer.style.cssText = 'margin: 15px 0; display: flex; gap: 10px;';

        const newCategoryInput = document.createElement('input');
        newCategoryInput.type = 'text';
        newCategoryInput.placeholder = '输入新分类名称';
        newCategoryInput.style.cssText = `
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

        // 渲染分类列表
        function renderCategories() {
            const categories = loadCustomCategories();
            categoriesList.innerHTML = '';

            categories.forEach((category, index) => {
                const categoryItem = document.createElement('div');
                categoryItem.draggable = true;
                categoryItem.dataset.categoryIndex = index;
                categoryItem.style.cssText = `
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
                categoryItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index);
                    categoryItem.style.opacity = '0.5';
                    categoryItem.classList.add('dragging');
                });

                categoryItem.addEventListener('dragend', () => {
                    categoryItem.style.opacity = '1';
                    categoryItem.classList.remove('dragging');
                    // 清除所有其他项的动画效果
                    const allItems = categoriesList.querySelectorAll('[data-category-index]');
                    allItems.forEach(item => {
                        item.style.transform = 'translateY(0)';
                        item.style.borderColor = '#555';
                        item.classList.remove('drop-target');
                    });
                });

                categoryItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (categoryItem.classList.contains('dragging')) return;

                    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const targetIndex = parseInt(categoryItem.dataset.categoryIndex);

                    // 高亮当前目标
                    categoryItem.style.borderColor = 'var(--color-primary)';
                    categoryItem.style.background = 'rgba(74, 158, 255, 0.1)';
                    categoryItem.classList.add('drop-target');

                    // 为其他项添加滑动效果
                    const allItems = categoriesList.querySelectorAll('[data-category-index]');
                    allItems.forEach(item => {
                        const itemIndex = parseInt(item.dataset.categoryIndex);
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

                categoryItem.addEventListener('dragleave', (e) => {
                    // 检查是否真的离开了元素
                    if (!categoryItem.contains(e.relatedTarget)) {
                        categoryItem.style.borderColor = '#555';
                        categoryItem.style.background = 'transparent';
                        categoryItem.classList.remove('drop-target');
                    }
                });

                categoryItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const targetIndex = parseInt(categoryItem.dataset.categoryIndex);

                    if (draggedIndex !== targetIndex) {
                        const categories = loadCustomCategories();
                        const draggedItem = categories.splice(draggedIndex, 1)[0];
                        categories.splice(targetIndex, 0, draggedItem);
                        saveCustomCategories(categories);
                        renderCategories();
                        refreshInventoryCategories();
                    }

                    // 清除所有动画效果
                    const allItems = categoriesList.querySelectorAll('[data-category-index]');
                    allItems.forEach(item => {
                        item.style.transform = 'translateY(0)';
                        item.style.borderColor = '#555';
                        item.style.background = 'transparent';
                        item.classList.remove('drop-target');
                    });
                });

                const nameSpan = document.createElement('span');
                nameSpan.textContent = category.name;
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
                    const newName = prompt('输入新的分类名称:', category.name);
                    if (newName && newName.trim() && newName !== category.name) {
                        const categories = loadCustomCategories();
                        categories[index].name = newName.trim();
                        saveCustomCategories(categories);
                        renderCategories();
                        refreshInventoryCategories();
                    }
                });

                // 删除事件
                deleteButton.addEventListener('click', () => {
                    if (confirm(`确定要删除分类 "${category.name}" 吗？`)) {
                        const categories = loadCustomCategories();
                        categories.splice(index, 1);
                        saveCustomCategories(categories);

                        // 清理物品关联
                        const itemCategories = loadItemCategories();
                        Object.keys(itemCategories).forEach(itemName => {
                            itemCategories[itemName] = itemCategories[itemName].filter(catId => catId !== category.id);
                            if (itemCategories[itemName].length === 0) {
                                delete itemCategories[itemName];
                            }
                        });
                        saveItemCategories(itemCategories);

                        renderCategories();
                        refreshInventoryCategories();
                    }
                });

                categoryItem.appendChild(nameSpan);
                categoryItem.appendChild(renameButton);
                categoryItem.appendChild(deleteButton);
                categoriesList.appendChild(categoryItem);
            });
        }

        // 添加分类事件
        addButton.addEventListener('click', () => {
            const name = newCategoryInput.value.trim();
            if (name) {
                const categories = loadCustomCategories();
                const newCategory = {
                    id: Date.now().toString(),
                    name: name
                };
                categories.push(newCategory);
                saveCustomCategories(categories);
                newCategoryInput.value = '';
                renderCategories();
                refreshInventoryCategories();
            }
        });

        // 回车添加分类
        newCategoryInput.addEventListener('keypress', (e) => {
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
        modal.appendChild(addCategoryContainer);
        modal.appendChild(categoriesList);
        addCategoryContainer.appendChild(newCategoryInput);
        addCategoryContainer.appendChild(addButton);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        renderCategories();
    }

    // 创建自定义分类页签
    function createCustomCategories() {
        const inventoryContainer = document.querySelector('.Inventory_items__6SXv0');
        if (!inventoryContainer) return;

        const categories = loadCustomCategories();
        const itemCategories = loadItemCategories();

        // 反向遍历分类数组以保持正确的显示顺序
        for (let i = categories.length - 1; i >= 0; i--) {
            const category = categories[i];
            const existingCategory = inventoryContainer.querySelector(`#MWI_IE_Custom_Category-${category.id}`);
            if (existingCategory) {
                continue;
            }

            // 收集属于此分类的物品
            const categoryItems = [];
            Object.keys(itemCategories).forEach(itemName => {
                if (itemCategories[itemName].includes(category.id)) {
                    const inventoryItem = document.querySelector(`.Inventory_items__6SXv0 .Item_itemContainer__x7kH1 svg[aria-label="${itemName}"]`);
                    if (inventoryItem) {
                        const itemContainer = inventoryItem.closest('.Item_itemContainer__x7kH1');
                        if (itemContainer) {
                            const clonedItem = itemContainer.cloneNode(true);

                            // 复制所有事件监听器的更有效方法
                            // 为克隆的物品添加点击事件，直接触发原始物品的点击
                            clonedItem.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // 直接点击原始物品
                                itemContainer.click();
                            });

                            // 为克隆的物品添加右键菜单事件
                            clonedItem.addEventListener('contextmenu', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // 在原始物品位置触发右键菜单
                                const rect = itemContainer.getBoundingClientRect();
                                const contextEvent = new MouseEvent('contextmenu', {
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: rect.left + rect.width / 2,
                                    clientY: rect.top + rect.height / 2,
                                    button: 2
                                });
                                itemContainer.dispatchEvent(contextEvent);
                            });

                            // 为克隆的物品添加鼠标悬停事件
                            clonedItem.addEventListener('mouseenter', (e) => {
                                // 触发原始物品的鼠标悬停
                                const mouseEnterEvent = new MouseEvent('mouseenter', {
                                    bubbles: true,
                                    cancelable: true
                                });
                                itemContainer.dispatchEvent(mouseEnterEvent);
                            });

                            clonedItem.addEventListener('mouseleave', (e) => {
                                // 触发原始物品的鼠标离开
                                const mouseLeaveEvent = new MouseEvent('mouseleave', {
                                    bubbles: true,
                                    cancelable: true
                                });
                                itemContainer.dispatchEvent(mouseLeaveEvent);
                            });

                            // 复制原始物品的所有属性
                            clonedItem.setAttribute('data-original-item', itemContainer.getAttribute('data-item-id') || itemName);

                            categoryItems.push(clonedItem);
                        }
                    }
                }
            });

            // 如果没有道具，处理隐藏逻辑
            if (categoryItems.length === 0) {
                // 如果分类已存在但没有道具，隐藏它
                if (existingCategory) {
                    existingCategory.style.display = 'none';
                }
                continue;
            }

            // 如果分类已存在且有道具，显示它并更新内容
            if (existingCategory) {
                existingCategory.style.display = 'block';
                // 清空现有内容并重新添加物品
                const existingGrid = existingCategory.querySelector('.Inventory_itemGrid__20YAH');
                if (existingGrid) {
                    // 保留分类标题，清空物品
                    const items = existingGrid.querySelectorAll('.Item_itemContainer__x7kH1');
                    items.forEach(item => item.remove());
                    // 添加新的物品
                    categoryItems.forEach(item => {
                        existingGrid.appendChild(item);
                    });
                }
                continue;
            }

            // 创建新分类
            const categoryContainer = document.createElement('div');
            categoryContainer.id = `MWI_IE_Custom_Category-${category.id}`;

            const itemGridHTML = `
                 <div class="Inventory_itemGrid__20YAH">
                     <div class="Inventory_label__XEOAx">
                         <span class="Inventory_categoryButton__35s1x" style="cursor: pointer;">${category.name}</span>
                     </div>
                 </div>
             `;
            categoryContainer.innerHTML = itemGridHTML;

            // 将自定义分类添加到仓库的最前面
            inventoryContainer.insertBefore(categoryContainer, inventoryContainer.firstChild);

            // 添加属于此分类的物品
            const categoryGrid = categoryContainer.querySelector('.Inventory_itemGrid__20YAH');
            const categoryButton = categoryGrid.querySelector('.Inventory_categoryButton__35s1x');

            // 创建物品图标
            categoryItems.forEach(item => {
                categoryGrid.appendChild(item);
            });

            // 添加折叠功能
            let isCollapsed = false;
            categoryButton.addEventListener('click', () => {
                isCollapsed = !isCollapsed;
                if (isCollapsed) {
                    // 折叠：删除所有物品HTML标签
                    categoryItems.forEach(item => {
                        if (item.parentNode === categoryGrid) {
                            categoryGrid.removeChild(item);
                        }
                    });
                    categoryButton.textContent = `+ ${category.name} (${categoryItems.length})`;
                } else {
                    // 展开：重新添加所有物品HTML标签
                    categoryItems.forEach(item => {
                        categoryGrid.appendChild(item);
                    });
                    categoryButton.textContent = `${category.name}`;
                }
            });
        }
    }

    // 创建管理分类按钮
    function createCategoryManagementButton() {
        if (document.getElementById('MWI_IE_Category_Management_Div')) return;

        const itemsInventoryContainer = document.querySelector('.MainPanel_mainPanel__Ex2Ir .Inventory_items__6SXv0');
        if (!itemsInventoryContainer) return;

        const managementDiv = document.createElement('div');
        managementDiv.id = 'MWI_IE_Category_Management_Div';
        managementDiv.style.cssText = `
            text-align: left;
        `;
        itemsInventoryContainer.parentElement.insertBefore(managementDiv, itemsInventoryContainer);

        const managementButton = document.createElement('button');
        managementButton.id = 'MWI_IE_Category_Management_Btn';
        managementButton.textContent = '管理分类';
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

        managementButton.addEventListener('click', createCategoryManagementUI);
        managementDiv.appendChild(managementButton);
    }

    // 添加物品分类按钮
    function addItemCategoryButton(menuContainer) {
        // 检查是否已存在分类按钮
        const existingButton = menuContainer.querySelector('.MWI_IE_Category_Btn');
        if (existingButton) return;

        const categoryButton = document.createElement('button');
        categoryButton.className = 'Button_button__1Fe9z Button_fullWidth__17pVU MWI_IE_Category_Btn';
        categoryButton.textContent = '分类管理';

        categoryButton.addEventListener('click', function () {
            const itemName = menuContainer.querySelector('.Item_name__2C42x').textContent.trim();
            showItemCategoryDialog(itemName);
        });

        menuContainer.appendChild(categoryButton);
    }

    // 显示物品分类对话框
    function showItemCategoryDialog(itemName) {
        // 检查是否已存在对话框
        if (document.querySelector('#MWI_IE_Item_Category_Dialog')) return;

        const overlay = document.createElement('div');
        overlay.id = 'MWI_IE_Item_Category_Dialog';
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
        title.textContent = `物品分类: ${itemName}`;
        title.style.cssText = 'margin: 0 0 15px 0; text-align: center; font-size: 16px;';

        const categoriesList = document.createElement('div');
        const categories = loadCustomCategories();
        const itemCategories = loadItemCategories();
        const currentItemCategories = itemCategories[itemName] || [];

        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            const isSelected = currentItemCategories.includes(category.id);

            categoryItem.style.cssText = `
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
            categoryItem.addEventListener('mouseenter', () => {
                if (!currentItemCategories.includes(category.id)) {
                    categoryItem.style.background = 'rgba(74, 158, 255, 0.3)';
                }
            });
            categoryItem.addEventListener('mouseleave', () => {
                if (!currentItemCategories.includes(category.id)) {
                    categoryItem.style.background = isSelected ? 'var(--color-primary)' : 'transparent';
                }
            });

            const label = document.createElement('span');
            label.textContent = category.name;
            label.style.cssText = `
                 flex: 1;
                 color: ${isSelected ? 'var(--color-text-dark-mode)' : 'white'};
                 font-weight: ${isSelected ? 'bold' : 'normal'};
             `;

            categoryItem.appendChild(label);
            categoriesList.appendChild(categoryItem);

            // 点击切换选择状态
            categoryItem.addEventListener('click', () => {
                const itemCategories = loadItemCategories();
                if (!itemCategories[itemName]) {
                    itemCategories[itemName] = [];
                }

                const isCurrentlySelected = itemCategories[itemName].includes(category.id);

                if (isCurrentlySelected) {
                     itemCategories[itemName] = itemCategories[itemName].filter(id => id !== category.id);
                     if (itemCategories[itemName].length === 0) {
                         delete itemCategories[itemName];
                     }
                     categoryItem.style.background = 'transparent';
                     categoryItem.style.border = '1px solid #555';
                     label.style.color = 'white';
                     label.style.fontWeight = 'normal';
                 } else {
                     itemCategories[itemName].push(category.id);
                     categoryItem.style.background = 'var(--color-primary)';
                     categoryItem.style.border = '2px solid white';
                     label.style.color = 'var(--color-text-dark-mode)';
                     label.style.fontWeight = 'bold';
                 }

                saveItemCategories(itemCategories);
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
            refreshInventoryCategories();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                refreshInventoryCategories();
            }
        });

        modal.appendChild(title);
        modal.appendChild(categoriesList);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // 刷新仓库分类显示
    function refreshInventoryCategories() {
        // 移除所有自定义分类
        const customCategories = document.querySelectorAll('[id^="MWI_IE_Custom_Category-"]');
        customCategories.forEach(cat => cat.remove());

        // 重新创建自定义分类
        createCustomCategories();
    }

    // 主刷新函数
    function refresh() {
        try {
            // 仓库页面检测
            const inventoryContainer = document.querySelector('.Inventory_items__6SXv0');
            if (inventoryContainer) {
                createCategoryManagementButton();
                createCustomCategories();
            }

            // 检查是否出现物品菜单
            const itemMenu = document.querySelector('.Item_actionMenu__2yUcG');
            if (itemMenu) {
                addItemCategoryButton(itemMenu);
            }
        } catch (error) {
            console.log('刷新函数出错:', error);
        }
    }

    // 设置MutationObserver监听DOM变化
    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver(function (mutationsList, observer) {
        refresh();
    });
    observer.observe(document, config);

    // 页面加载完成后执行一次
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
    } else {
        refresh();
    }

})();