// 游戏状态
const gameState = {
    currentTent: null,
    currentColor: null, // 初始不设置颜色
    currentPillow: null,
    items: [],
    originalBackImageData: null, // 保存原始背景图像数据
    backImageObj: null, // 保存背景图像对象
    originalFrontImage: null, // 保存前景图像对象
    originalFrontImageData: null // 保存原始前景图像数据
};

// 受保护的颜色列表（这些区域不应该被上色）
const protectedColors = [
    { hex: '#DFD1BE', name: '米色' },
    { hex: '#EBBC6E', name: '金黄色' },
    { hex: '#C9A3D4', name: '紫色' },
    { hex: '#886362', name: '棕色' },
    { hex: '#EBE4E4', name: '浅灰色' },
    { hex: '#F2DF82', name: '浅黄色' },
    { hex: '#A68778', name: '褐色' },
    { hex: '#867F7F', name: '灰褐色' },
    { hex: '#0c0a0aff', name: '粉红色' },
    { hex: '#FFE2A3', name: '淡黄色' },
    { hex: '#F2DF82', name: '淡黄色' },
    { hex: '#F8F5F5', name: '淡黄色' },
    { hex: '#FFFFFF', name: '淡黄色' },
    { hex: '#F4D987', name: '淡黄色' },
    { hex: '#D97C7C', name: '淡黄色' }
];

// 将十六进制颜色转换为RGB对象
function hexToRgbObj(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// 计算两个颜色之间的欧几里得距离
function colorDistance(rgb1, rgb2) {
    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
}

// 检查像素颜色是否为受保护的颜色（这些区域不应该被上色）
function isProtectedPixel(r, g, b, threshold = 1) {
    const pixelColor = { r, g, b };
    // 检查是否与受保护颜色相近
    for (const protectedColor of protectedColors) {
        const protectedRgb = hexToRgbObj(protectedColor.hex);
        if (protectedRgb && (colorDistance(pixelColor, protectedRgb) < threshold)) {
            return true;
        }
    }
    
    return false;
}

// 检查目标颜色是否为受保护的颜色（防止用户选择保护色）
function isTargetColorProtected(targetColor) {
    const targetRgb = hexToRgbObj(targetColor);
    if (!targetRgb) return false;
    
    for (const protectedColor of protectedColors) {
        const protectedRgb = hexToRgbObj(protectedColor.hex);
        if (protectedRgb && colorDistance(targetRgb, protectedRgb) < 1) {
            return true;
        }
    }
    
    return false;
}

// 防抖函数 - 用于优化颜色选择器性能
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Canvas 元素
const tentBackCanvas = document.getElementById('tentBackCanvas');
const tentFrontCanvas = document.getElementById('tentFrontCanvas');
const colorLayer = document.getElementById('colorLayer');
const backCtx = tentBackCanvas.getContext('2d');
const frontCtx = tentFrontCanvas.getContext('2d');

// 容器元素
const pillowContainer = document.getElementById('pillowContainer');
const itemContainer = document.getElementById('itemContainer');

// 摆件列表
const itemFiles = [
    '未命名作品-1 3.png',
    '未命名作品-2 3.png',
    '未命名作品-3 3.png',
    '未命名作品-4 2.png',
    '未命名作品-5 2.png',
    '未命名作品-6 2.png',
    '未命名作品-7 2.png',
    '未命名作品-8 2.png',
    '未命名作品-9 2.png',
    '未命名作品-10 2.png',
    '未命名作品-11 2.png',
    '未命名作品-12 2.png',
    '未命名作品-13 2.png',
    '未命名作品-14.png',
    '未命名作品-15.png'
];

// UI按钮切换
document.querySelectorAll('.ui-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const section = this.dataset.section;
        
        // 切换所有按钮的图片为未选中状态
        document.querySelectorAll('.ui-btn').forEach(b => {
            const btnSection = b.dataset.section;
            b.src = `ui/ui_${btnSection}.png`;
            b.classList.remove('active');
        });
        
        // 切换当前按钮为选中状态
        this.src = `ui/ui_${section}_selected.png`;
        this.classList.add('active');
        
        // 隐藏所有选择区域
        document.querySelectorAll('.selection-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // 显示对应的选择区域
        const targetSection = document.getElementById(`${section}Selection`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    });
});

// 初始化摆件按钮
function initItemButtons() {
    const itemOptions = document.getElementById('itemOptions');
    itemFiles.forEach((file, index) => {
        const btn = document.createElement('button');
        btn.className = 'item-btn';
        btn.innerHTML = `<img src="item/${file}" alt="摆件${index + 1}">`;
        btn.addEventListener('click', () => addItem(file));
        itemOptions.appendChild(btn);
    });
}

// 帐篷选择
document.querySelectorAll('.tent-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tent-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tentNum = this.dataset.tent;
        gameState.currentTent = tentNum;
        
        // 清空枕头和摆件
        pillowContainer.innerHTML = '';
        itemContainer.innerHTML = '';
        gameState.items = [];
        gameState.currentPillow = null;
        
        // 取消枕头按钮的选中状态
        document.querySelectorAll('.pillow-btn').forEach(b => b.classList.remove('active'));
        
        loadTent(tentNum);
    });
});

// 颜色应用函数（带防抖）
const debouncedApplyColor = debounce(() => {
    if (gameState.currentTent) {
        applyColorToTent();
    }
}, 100); // 100ms 延迟

// 颜色选择
document.getElementById('colorPicker').addEventListener('input', function(e) {
    const selectedColor = e.target.value;
    
    // 检查选择的颜色是否为受保护的颜色
    if (isTargetColorProtected(selectedColor)) {
        alert('不能选择这个颜色，它是受保护的颜色区域！');
        // 恢复到之前的颜色
        this.value = gameState.currentColor || '#ffffff';
        return;
    }
    
    gameState.currentColor = selectedColor;
    // 取消预设颜色的选中状态
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
        const colorName = btn.dataset.name;
        btn.src = `ui/color_${colorName}.png`;
        btn.classList.remove('active');
    });
    
    // 使用防抖函数应用颜色
    debouncedApplyColor();
});

// 预设颜色选择
document.querySelectorAll('.color-preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const color = this.dataset.color;
        const colorName = this.dataset.name;
        
        // 检查选择的颜色是否为受保护的颜色
        if (isTargetColorProtected(color)) {
            alert('不能选择这个颜色，它是受保护的颜色区域！');
            return;
        }
        
        // 更新颜色
        gameState.currentColor = color;
        document.getElementById('colorPicker').value = color;
        
        // 切换所有预设颜色按钮为未选中状态
        document.querySelectorAll('.color-preset-btn').forEach(b => {
            const name = b.dataset.name;
            b.src = `ui/color_${name}.png`;
            b.classList.remove('active');
        });
        
        // 切换当前按钮为选中状态
        // 注意：red的selected文件名拼写错误，需要特殊处理
        if (colorName === 'red') {
            this.src = `ui/color_red_selcted.png`; // 原文件名拼写错误
        } else {
            this.src = `ui/color_${colorName}_selected.png`;
        }
        this.classList.add('active');
        
        // 应用颜色
        if (gameState.currentTent) {
            applyColorToTent();
        }
    });
});

// 枕头选择
document.querySelectorAll('.pillow-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.pillow-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const pillowNum = this.dataset.pillow;
        gameState.currentPillow = pillowNum;
        loadPillow(pillowNum);
    });
});

// 加载帐篷
function loadTent(tentNum) {
    const backImg = new Image();
    const frontImg = new Image();
    
    // 设置crossOrigin以避免canvas污染
    backImg.crossOrigin = 'anonymous';
    frontImg.crossOrigin = 'anonymous';
    
    // 添加时间戳防止缓存
    const timestamp = new Date().getTime();
    backImg.src = `tent/tent${tentNum}_back.png?t=${timestamp}`;
    frontImg.src = `tent/tent${tentNum}.png?t=${timestamp}`;
    
    let backLoaded = false;
    let frontLoaded = false;
    
    backImg.onload = function() {
        backLoaded = true;
        if (frontLoaded) drawTent(backImg, frontImg);
    };
    
    frontImg.onload = function() {
        frontLoaded = true;
        if (backLoaded) drawTent(backImg, frontImg);
    };
}

// 绘制帐篷
function drawTent(backImg, frontImg) {
    // 设置 canvas 尺寸
    const maxWidth = tentBackCanvas.parentElement.clientWidth * 0.8;
    const maxHeight = tentBackCanvas.parentElement.clientHeight * 0.8;
    
    const scale = Math.min(maxWidth / frontImg.width, maxHeight / frontImg.height);
    const width = frontImg.width * scale;
    const height = frontImg.height * scale;
    
    tentBackCanvas.width = width;
    tentBackCanvas.height = height;
    tentFrontCanvas.width = width;
    tentFrontCanvas.height = height;
    
    // 设置颜色层尺寸
    colorLayer.style.width = width + 'px';
    colorLayer.style.height = height + 'px';
    colorLayer.style.display = 'none';
    
    // 绘制背景层
    backCtx.clearRect(0, 0, width, height);
    backCtx.drawImage(backImg, 0, 0, width, height);
    
    // 保存原始背景图像数据
    gameState.originalBackImageData = backCtx.getImageData(0, 0, width, height);
    gameState.backImageObj = backImg;
    
    // 绘制前景层
    frontCtx.clearRect(0, 0, width, height);
    frontCtx.drawImage(frontImg, 0, 0, width, height);
    
    // 保存原始前景图像数据
    gameState.originalFrontImage = frontImg;
    gameState.originalFrontImageData = frontCtx.getImageData(0, 0, width, height);
    
    // 只有在已选择颜色时才应用颜色
    if (gameState.currentColor) {
        applyColorToTent();
    }
}

// 应用颜色到帐篷（像素级处理，保护特定颜色区域）
function applyColorToTent() {
    if (!gameState.currentTent || !gameState.originalBackImageData || !gameState.originalFrontImageData) return;
    
    const width = tentBackCanvas.width;
    const height = tentBackCanvas.height;
    
    // 获取目标颜色的RGB值
    const targetRgb = hexToRgbObj(gameState.currentColor);
    if (!targetRgb) return;
    
    // 处理背景层
    const originalBackData = gameState.originalBackImageData;
    const newBackImageData = backCtx.createImageData(width, height);
    
    // 复制原始背景数据
    for (let i = 0; i < originalBackData.data.length; i++) {
        newBackImageData.data[i] = originalBackData.data[i];
    }
    
    const backData = newBackImageData.data;
    
    // 遍历背景层每个像素
    for (let i = 0; i < backData.length; i += 4) {
        const r = backData[i];
        const g = backData[i + 1];
        const b = backData[i + 2];
        const a = backData[i + 3];
        
        // 跳过完全透明的像素
        if (a === 0) continue;
        
        // 检查是否为受保护的颜色区域
        if (!isProtectedPixel(r, g, b)) {
            // 计算原始像素的亮度
            const originalBrightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            
            // 应用目标颜色，保持原始亮度
            backData[i] = targetRgb.r * originalBrightness;
            backData[i + 1] = targetRgb.g * originalBrightness;
            backData[i + 2] = targetRgb.b * originalBrightness;
        }
    }
    
    // 将修改后的背景图像数据绘制到背景canvas
    backCtx.putImageData(newBackImageData, 0, 0);
    
    // 处理前景层
    const originalFrontData = gameState.originalFrontImageData;
    const newFrontImageData = frontCtx.createImageData(width, height);
    
    // 复制原始前景数据
    for (let i = 0; i < originalFrontData.data.length; i++) {
        newFrontImageData.data[i] = originalFrontData.data[i];
    }
    
    const frontData = newFrontImageData.data;
    
    // 遍历前景层每个像素
    for (let i = 0; i < frontData.length; i += 4) {
        const r = frontData[i];
        const g = frontData[i + 1];
        const b = frontData[i + 2];
        const a = frontData[i + 3];
        
        // 跳过完全透明的像素
        if (a === 0) continue;
        
        // 检查是否为受保护的颜色区域
        if (!isProtectedPixel(r, g, b)) {
            // 计算原始像素的亮度
            const originalBrightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            
            // 应用目标颜色，保持原始亮度
            frontData[i] = targetRgb.r * originalBrightness;
            frontData[i + 1] = targetRgb.g * originalBrightness;
            frontData[i + 2] = targetRgb.b * originalBrightness;
        }
    }
    
    // 将修改后的前景图像数据绘制到前景canvas
    frontCtx.putImageData(newFrontImageData, 0, 0);
}

// 十六进制颜色转 RGB（保留用于兼容性）
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 107, b: 157 };
}

// 不同帐篷的枕头位置配置
const pillowPositions = {
    '1': { left: '50%', bottom: '15%', transform: 'translateX(-50%)' },
    '2': { left: '48%', bottom: '28%', transform: 'translateX(-50%)' }, // 暂时使用tent1的位置
    '3': { left: '48%', bottom: '18%', transform: 'translateX(-50%)' }  // 暂时使用tent1的位置
};

// 加载枕头
function loadPillow(pillowNum) {
    pillowContainer.innerHTML = '';
    
    const pillowDiv = document.createElement('div');
    pillowDiv.className = 'pillow-item';
    
    const img = document.createElement('img');
    // 添加时间戳防止缓存
    const timestamp = new Date().getTime();
    img.src = `Pillow/未命名作品-${pillowNum}.png?t=${timestamp}`;
    
    img.onload = function() {
        // 将枕头放置在帐篷底部
        const tentArea = document.getElementById('tentArea');
        const pillowWidth = tentArea.clientWidth * 0.2;
        const pillowHeight = (img.height / img.width) * pillowWidth;
        
        pillowDiv.style.width = pillowWidth + 'px';
        pillowDiv.style.height = pillowHeight + 'px';
        
        // 根据当前帐篷设置位置
        const position = pillowPositions[gameState.currentTent] || pillowPositions['1'];
        pillowDiv.style.left = position.left;
        pillowDiv.style.bottom = position.bottom;
        pillowDiv.style.transform = position.transform;
        
        pillowDiv.appendChild(img);
        pillowContainer.appendChild(pillowDiv);
    };
}

// 添加摆件
let itemIdCounter = 0;
function addItem(fileName) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'draggable-item';
    itemDiv.dataset.itemId = itemIdCounter++;
    
    const img = document.createElement('img');
    // 添加时间戳防止缓存
    const timestamp = new Date().getTime();
    img.src = `item/${fileName}?t=${timestamp}`;
    
    img.onload = function() {
        const tentArea = document.getElementById('tentArea');
        const itemWidth = tentArea.clientWidth * 0.15;
        const itemHeight = (img.height / img.width) * itemWidth;
        
        itemDiv.style.width = itemWidth + 'px';
        itemDiv.style.height = itemHeight + 'px';
        itemDiv.style.left = '50%';
        itemDiv.style.top = '50%';
        itemDiv.style.transform = 'translate(-50%, -50%)';
        
        itemDiv.appendChild(img);
        itemContainer.appendChild(itemDiv);
        
        clampElementToTentBounds(itemDiv);
        makeDraggable(itemDiv);
        makeResizable(itemDiv);
    };
}

function getTentBoundsInContainer(container) {
    const tentRect = tentBackCanvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
        left: tentRect.left - containerRect.left,
        top: tentRect.top - containerRect.top,
        right: tentRect.right - containerRect.left,
        bottom: tentRect.bottom - containerRect.top
    };
}

function clampElementToTentBounds(element) {
    const parent = element.offsetParent || itemContainer;
    const bounds = getTentBoundsInContainer(parent);
    const maxLeft = Math.max(bounds.left, bounds.right - element.offsetWidth);
    const maxTop = Math.max(bounds.top, bounds.bottom - element.offsetHeight);
    const nextLeft = Math.min(Math.max(element.offsetLeft, bounds.left), maxLeft);
    const nextTop = Math.min(Math.max(element.offsetTop, bounds.top), maxTop);
    element.style.left = nextLeft + 'px';
    element.style.top = nextTop + 'px';
    element.style.transform = 'none';
}

function getTentAlphaAtClientPoint(clientX, clientY) {
    if (!gameState.originalBackImageData || !gameState.originalFrontImageData) return false;
    const tentRect = tentBackCanvas.getBoundingClientRect();
    if (tentRect.width <= 0 || tentRect.height <= 0) return false;
    if (clientX < tentRect.left || clientX > tentRect.right || clientY < tentRect.top || clientY > tentRect.bottom) return false;

    const xRatio = (clientX - tentRect.left) / tentRect.width;
    const yRatio = (clientY - tentRect.top) / tentRect.height;
    const x = Math.max(0, Math.min(tentBackCanvas.width - 1, Math.floor(xRatio * tentBackCanvas.width)));
    const y = Math.max(0, Math.min(tentBackCanvas.height - 1, Math.floor(yRatio * tentBackCanvas.height)));
    const pixelIndex = (y * tentBackCanvas.width + x) * 4 + 3;

    const backAlpha = gameState.originalBackImageData.data[pixelIndex] || 0;
    const frontAlpha = gameState.originalFrontImageData.data[pixelIndex] || 0;
    return backAlpha > 0 || frontAlpha > 0;
}

function isElementInsideTentOpaquePixels(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // 仅要求中心点落在帐篷非透明区域内，避免矩形四角导致无法拖动
    return getTentAlphaAtClientPoint(centerX, centerY);
}

function updatePositionWithTentMask(element, nextLeft, nextTop, state) {
    element.style.left = nextLeft + 'px';
    element.style.top = nextTop + 'px';
    element.style.transform = 'none';
    clampElementToTentBounds(element);

    if (isElementInsideTentOpaquePixels(element)) {
        state.lastValidLeft = element.offsetLeft;
        state.lastValidTop = element.offsetTop;
    }
}

// 使元素可拖拽
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    const state = {
        lastValidLeft: element.offsetLeft,
        lastValidTop: element.offsetTop
    };
    
    element.addEventListener('mousedown', dragMouseDown);
    element.addEventListener('touchstart', dragTouchStart, { passive: false });
    
    function dragMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        pos3 = e.clientX;
        pos4 = e.clientY;
        isDragging = true;
        
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', closeDragElement);
    }
    
    function dragTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        isDragging = true;
        
        document.addEventListener('touchmove', elementTouchDrag, { passive: false });
        document.addEventListener('touchend', closeDragElement);
    }
    
    function elementDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        const nextTop = element.offsetTop - pos2;
        const nextLeft = element.offsetLeft - pos1;
        updatePositionWithTentMask(element, nextLeft, nextTop, state);
    }
    
    function elementTouchDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        
        const nextTop = element.offsetTop - pos2;
        const nextLeft = element.offsetLeft - pos1;
        updatePositionWithTentMask(element, nextLeft, nextTop, state);
    }
    
    function closeDragElement() {
        if (!isElementInsideTentOpaquePixels(element)) {
            element.style.left = state.lastValidLeft + 'px';
            element.style.top = state.lastValidTop + 'px';
            element.style.transform = 'none';
        }
        isDragging = false;
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
        document.removeEventListener('touchmove', elementTouchDrag);
        document.removeEventListener('touchend', closeDragElement);
    }
}

// 使元素可缩放（通过滚轮）
function makeResizable(element) {
    element.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const currentWidth = element.offsetWidth;
        const currentHeight = element.offsetHeight;
        const prevWidth = currentWidth;
        const prevHeight = currentHeight;
        const prevLeft = element.offsetLeft;
        const prevTop = element.offsetTop;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        
        const newWidth = currentWidth * delta;
        const newHeight = currentHeight * delta;
        
        // 限制最小和最大尺寸
        if (newWidth > 30 && newWidth < 500) {
            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
            clampElementToTentBounds(element);

            if (!isElementInsideTentOpaquePixels(element)) {
                element.style.width = prevWidth + 'px';
                element.style.height = prevHeight + 'px';
                element.style.left = prevLeft + 'px';
                element.style.top = prevTop + 'px';
                element.style.transform = 'none';
            }
        }
    }, { passive: false });
    
    // 双击删除
    element.addEventListener('dblclick', function() {
        if (confirm('确定要删除这个摆件吗？')) {
            element.remove();
        }
    });
}

// 初始化
initItemButtons();

// 默认显示帐篷选择
document.querySelector('.ui-btn[data-section="tent"]').click();
// 默认选择第一个帐篷
document.querySelector('.tent-btn').click();

// 确认按钮 - 保存帐篷为图片
document.getElementById('confirmBtn').addEventListener('click', function() {
    if (!gameState.currentTent) {
        alert('请先选择一个帐篷！');
        return;
    }
    
    // 创建一个临时canvas来合并所有图层
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const width = tentBackCanvas.width;
    const height = tentBackCanvas.height;
    
    tempCanvas.width = width;
    tempCanvas.height = height;

    const tentRect = tentBackCanvas.getBoundingClientRect();
    const scaleX = width / tentRect.width;
    const scaleY = height / tentRect.height;
    
    // 绘制背景层
    tempCtx.drawImage(tentBackCanvas, 0, 0);
    
    // 绘制枕头层
    const pillowItems = pillowContainer.querySelectorAll('.pillow-item');
    pillowItems.forEach(item => {
        const img = item.querySelector('img');
        if (img && img.complete) {
            const rect = item.getBoundingClientRect();
            const x = (rect.left - tentRect.left) * scaleX;
            const y = (rect.top - tentRect.top) * scaleY;
            const w = rect.width * scaleX;
            const h = rect.height * scaleY;
            
            tempCtx.drawImage(img, x, y, w, h);
        }
    });
    
    // 绘制摆件层
    const itemElements = itemContainer.querySelectorAll('.draggable-item');
    itemElements.forEach(item => {
        const img = item.querySelector('img');
        if (img && img.complete) {
            const rect = item.getBoundingClientRect();
            const x = (rect.left - tentRect.left) * scaleX;
            const y = (rect.top - tentRect.top) * scaleY;
            const w = rect.width * scaleX;
            const h = rect.height * scaleY;
            
            tempCtx.drawImage(img, x, y, w, h);
        }
    });
    
    // 绘制前景层
    tempCtx.drawImage(tentFrontCanvas, 0, 0);
    
    // 转换为图片并下载
    tempCanvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `my-tent-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
});
