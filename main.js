/**
 * 画像条件便 - メインJavaScript
 */

// グローバル変数
let currentFile = null;
let processedCanvas = null;
let originalImage = null;
let cropData = null;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let params = {};
let toastInstance = null;
let currentLongUrl = '';

// Short.io 設定
const SHORT_IO_ENDPOINT = 'https://api.short.io/links/public';
const SHORT_IO_DOMAIN = 's.village-se.com';
const SHORT_IO_API_KEY = 'pk_Y3wd4PtuCG7KQmwP';

/**
 * ポインター位置を取得（マウス/タッチ対応）
 */
function getPointerPosition(event) {
    if (event.touches && event.touches.length > 0) {
        return {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }

    if (event.changedTouches && event.changedTouches.length > 0) {
        return {
            x: event.changedTouches[0].clientX,
            y: event.changedTouches[0].clientY
        };
    }

    return {
        x: event.clientX,
        y: event.clientY
    };
}

/**
 * 初期化処理
 */
document.addEventListener('DOMContentLoaded', function() {
    // ページ判定
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            initIndexPage();
            break;
        case 'generator':
            initGeneratorPage();
            break;
        case 'expired':
            initExpiredPage();
            break;
    }
    
    // 共通初期化
    initCommonFeatures();
});

/**
 * 現在のページを判定
 */
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('generator.html')) return 'generator';
    if (path.includes('expired.html')) return 'expired';
    return 'index';
}

/**
 * 共通機能の初期化
 */
function initCommonFeatures() {
    // Bootstrap Toast初期化
    const toastEl = document.getElementById('toast');
    if (toastEl) {
        toastInstance = new bootstrap.Toast(toastEl);
    }
    
    // 滑らかなスクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

/**
 * index.html の初期化
 */
function initIndexPage() {
    params = parseUrlParams();
    displayConditionBanner(params);
    
    const shareUrl = document.getElementById('shareUrl');
    if (shareUrl) {
        shareUrl.value = generateShareLink();
    }

    // DOM要素取得
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewArea = document.getElementById('previewArea');
    const previewImage = document.getElementById('previewImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const copyBtn = document.getElementById('copyBtn');

    // サイズエラー関連のボタン
    const autoCropBtn = document.getElementById('autoCropBtn');
    const manualCropBtn = document.getElementById('manualCropBtn');
    const ignoreSizeBtn = document.getElementById('ignoreSizeBtn');
    const executeCropBtn = document.getElementById('executeCropBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');

    if (!uploadArea) return; // index.htmlでない場合は終了

    // イベントリスナー設定
    setupIndexEventListeners();
}

/**
 * index.html のイベントリスナー設定
 */
function setupIndexEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const copyBtn = document.getElementById('copyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const autoCropBtn = document.getElementById('autoCropBtn');
    const manualCropBtn = document.getElementById('manualCropBtn');
    const ignoreSizeBtn = document.getElementById('ignoreSizeBtn');
    const executeCropBtn = document.getElementById('executeCropBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');

    // ファイル選択
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // ドラッグ&ドロップ
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // サイズエラー時のボタンイベント
    if (autoCropBtn) {
        autoCropBtn.addEventListener('click', async () => {
            try {
                const canvas = await processImage(currentFile, params, true);
                const blob = await adjustFileSize(canvas, params.format, params.maxSize);
                
                const previewImage = document.getElementById('previewImage');
                previewImage.src = URL.createObjectURL(blob);
                previewImage.style.border = 'none';
                
                document.getElementById('sizeErrorAlert').classList.add('d-none');
                
                updateInfoPanel(currentFile, blob, params);
                setupDownloadButton(blob);
                showToast('自動切り取りが完了しました！');
                
            } catch (error) {
                showToast('自動切り取りに失敗しました', 'danger');
                console.error(error);
            }
        });
    }

    if (manualCropBtn) {
        manualCropBtn.addEventListener('click', () => {
            initManualCrop(originalImage);
            document.getElementById('cropArea').classList.remove('d-none');
        });
    }

    if (ignoreSizeBtn) {
        ignoreSizeBtn.addEventListener('click', async () => {
            try {
                const canvas = await processImage(currentFile, params, true);
                const blob = await adjustFileSize(canvas, params.format, params.maxSize);
                
                const previewImage = document.getElementById('previewImage');
                previewImage.src = URL.createObjectURL(blob);
                previewImage.style.border = 'none';
                
                document.getElementById('sizeErrorAlert').classList.add('d-none');
                
                updateInfoPanel(currentFile, blob, params);
                setupDownloadButton(blob);
                showToast('処理が完了しました');
                
            } catch (error) {
                showToast('処理に失敗しました', 'danger');
                console.error(error);
            }
        });
    }

    if (executeCropBtn) {
        executeCropBtn.addEventListener('click', executeCrop);
    }

    if (cancelCropBtn) {
        cancelCropBtn.addEventListener('click', () => {
            document.getElementById('cropArea').classList.add('d-none');
            cropData = null;
        });
    }

    // リセットボタン
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('previewArea').classList.add('d-none');
            document.getElementById('uploadArea').classList.remove('d-none');
            document.getElementById('sizeErrorAlert').classList.add('d-none');
            const cropArea = document.getElementById('cropArea');
            if (cropArea) cropArea.classList.add('d-none');
            currentFile = null;
            processedCanvas = null;
            originalImage = null;
            cropData = null;
            fileInput.value = '';
        });
    }

    // コピーボタン
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                const shareUrl = document.getElementById('shareUrl');
                await navigator.clipboard.writeText(shareUrl.value);
                showToast('リンクをコピーしました');
            } catch (error) {
                showToast('コピーに失敗しました', 'danger');
                console.error(error);
            }
        });
    }
}

/**
 * generator.html の初期化
 */
function initGeneratorPage() {
    const form = document.getElementById('paramForm');
    if (!form) return; // generator.htmlでない場合は終了

    // 初期URL生成
    updateUrl();

    // イベントリスナー設定
    setupGeneratorEventListeners();
}

/**
 * generator.html のイベントリスナー設定
 */
function setupGeneratorEventListeners() {
    const form = document.getElementById('paramForm');
    const copyUrlBtn = document.getElementById('copyUrlBtn');
    const openUrlBtn = document.getElementById('openUrlBtn');
    const createShortBtn = document.getElementById('createShortBtn');

    // フォーム変更時のURL更新
    form.addEventListener('input', updateUrl);
    form.addEventListener('change', updateUrl);

    // 比率・向きの変更時に最大幅・高さを自動調整
    const ratioInputs = form.querySelectorAll('input[name="ratio"]');
    const orientInputs = form.querySelectorAll('input[name="orient"]');
    
    ratioInputs.forEach(input => {
        input.addEventListener('change', () => {
            adjustMaxDimensions();
            updateUrl();
        });
    });
    
    orientInputs.forEach(input => {
        input.addEventListener('change', () => {
            adjustMaxDimensions();
            updateUrl();
        });
    });

    // URLコピー
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', () => {
            copyToClipboard(currentLongUrl);
        });
    }

    // URL開く
    if (openUrlBtn) {
        openUrlBtn.addEventListener('click', () => {
            window.open(currentLongUrl, '_blank');
        });
    }

    // 短縮URL作成
    if (createShortBtn) {
        createShortBtn.addEventListener('click', createShortUrl);
    }
}

/**
 * expired.html の初期化
 */
function initExpiredPage() {
    displayDescription();
    
    // アニメーション効果
    const card = document.querySelector('.expired-card');
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);
    }
}

/**
 * URLパラメータを取得・解析
 */
function parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        ratio: urlParams.get('ratio') || '16:9',
        orient: urlParams.get('orient') || 'landscape',
        maxSize: parseInt(urlParams.get('maxSize')) || 1000,
        format: urlParams.get('format') || 'jpeg',
        maxW: parseInt(urlParams.get('maxW')) || 1920,
        maxH: parseInt(urlParams.get('maxH')) || 1080,
        desc: urlParams.get('desc') || ''
    };
}

/**
 * 条件バナーを表示
 */
function displayConditionBanner(params) {
    if (params.desc) {
        const banner = document.getElementById('conditionBanner');
        const text = document.getElementById('conditionText');
        if (banner && text) {
            text.textContent = `変換条件: ${params.desc}`;
            banner.classList.remove('d-none');
        }
    }
}

/**
 * 共有リンクを生成
 */
function generateShareLink() {
    const currentUrl = new URL(window.location);
    currentUrl.search = '';
    
    const urlParams = new URLSearchParams();
    if (params.ratio !== '16:9') urlParams.set('ratio', params.ratio);
    if (params.orient !== 'landscape') urlParams.set('orient', params.orient);
    if (params.maxSize !== 1000) urlParams.set('maxSize', params.maxSize);
    if (params.format !== 'jpeg') urlParams.set('format', params.format);
    if (params.maxW !== 1920) urlParams.set('maxW', params.maxW);
    if (params.maxH !== 1080) urlParams.set('maxH', params.maxH);
    if (params.desc) urlParams.set('desc', params.desc);

    currentUrl.search = urlParams.toString();
    return currentUrl.toString();
}

/**
 * ファイル選択時の処理
 */
async function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        showToast('画像ファイルを選択してください', 'danger');
        return;
    }

    currentFile = file;
    cropData = null;
    
    try {
        const canvas = await processImage(file, params);
        const blob = await adjustFileSize(canvas, params.format, params.maxSize);
        
        const previewImage = document.getElementById('previewImage');
        previewImage.src = URL.createObjectURL(blob);
        previewImage.style.border = 'none';
        
        document.getElementById('previewArea').classList.remove('d-none');
        document.getElementById('uploadArea').classList.add('d-none');
        
        updateInfoPanel(file, blob, params);
        setupDownloadButton(blob);
        
    } catch (error) {
        if (error.message === 'SIZE_MISMATCH') {
            return;
        }
        showToast('画像の処理に失敗しました', 'danger');
        console.error(error);
    }
}

/**
 * 画像比率をチェック
 */
function checkImageRatio(img, params) {
    const [ratioW, ratioH] = params.ratio.split(':').map(Number);
    const targetRatio = params.orient === 'portrait' ? ratioH / ratioW : ratioW / ratioH;
    const currentRatio = img.width / img.height;
    
    return Math.abs(currentRatio - targetRatio) / targetRatio < 0.05;
}

/**
 * 画像を処理（クロップ・リサイズ・形式変換）
 */
function processImage(file, params, ignoreSizeCheck = false) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            originalImage = img;
            
            if (!ignoreSizeCheck && !checkImageRatio(img, params)) {
                showSizeError(img);
                reject(new Error('SIZE_MISMATCH'));
                return;
            }
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const [ratioW, ratioH] = params.ratio.split(':').map(Number);
            const targetRatio = params.orient === 'portrait' ? ratioH / ratioW : ratioW / ratioH;

            let { width, height } = img;
            let sx = 0, sy = 0, sw = width, sh = height;
            
            if (cropData) {
                sx = cropData.x;
                sy = cropData.y;
                sw = cropData.width;
                sh = cropData.height;
            } else {
                const currentRatio = width / height;
                
                if (currentRatio > targetRatio) {
                    sw = height * targetRatio;
                    sx = (width - sw) / 2;
                } else if (currentRatio < targetRatio) {
                    sh = width / targetRatio;
                    sy = (height - sh) / 2;
                }
            }

            let outputW = Math.min(params.maxW, sw);
            let outputH = Math.min(params.maxH, sh);
            
            if (outputW / outputH > targetRatio) {
                outputW = outputH * targetRatio;
            } else {
                outputH = outputW / targetRatio;
            }

            canvas.width = Math.round(outputW);
            canvas.height = Math.round(outputH);

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            processedCanvas = canvas;
            resolve(canvas);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * サイズエラーを表示
 */
function showSizeError(img) {
    const errorAlert = document.getElementById('sizeErrorAlert');
    const previewImage = document.getElementById('previewImage');
    
    if (previewImage) {
        previewImage.src = img.src;
        previewImage.style.border = '3px solid #ffc107';
    }
    
    if (errorAlert) {
        errorAlert.classList.remove('d-none');
    }
    
    document.getElementById('previewArea').classList.remove('d-none');
    document.getElementById('uploadArea').classList.add('d-none');
}

/**
 * 手動切り取り機能を初期化
 */
function initManualCrop(img) {
    const cropImage = document.getElementById('cropImage');
    const cropOverlay = document.getElementById('cropOverlay');
    const cropContainer = document.getElementById('cropContainer');
    
    cropImage.src = img.src;
    cropImage.onload = function() {
        const imgRect = cropImage.getBoundingClientRect();
        
        const [ratioW, ratioH] = params.ratio.split(':').map(Number);
        const targetRatio = params.orient === 'portrait' ? ratioH / ratioW : ratioW / ratioH;
        
        let width, height;
        if (imgRect.width / imgRect.height > targetRatio) {
            height = imgRect.height * 0.8;
            width = height * targetRatio;
        } else {
            width = imgRect.width * 0.8;
            height = width / targetRatio;
        }
        
        const left = (imgRect.width - width) / 2;
        const top = (imgRect.height - height) / 2;
        
        cropOverlay.style.left = left + 'px';
        cropOverlay.style.top = top + 'px';
        cropOverlay.style.width = width + 'px';
        cropOverlay.style.height = height + 'px';
        
        setupCropDrag();
    };
}

/**
 * 切り取りドラッグ機能を設定
 */
function setupCropDrag() {
    const cropOverlay = document.getElementById('cropOverlay');
    const cropImage = document.getElementById('cropImage');
    const cropContainer = document.getElementById('cropContainer');
    
    let isResizing = false;
    let resizeDirection = '';
    
    // オーバーレイのドラッグ（移動）
    function startDrag(e) {
        if (e.target.classList.contains('crop-handle')) return;

        const pointer = getPointerPosition(e);

        isDragging = true;
        const rect = cropOverlay.getBoundingClientRect();
        dragStart.x = pointer.x - rect.left;
        dragStart.y = pointer.y - rect.top;

        e.preventDefault();
    }

    cropOverlay.addEventListener('mousedown', startDrag);
    cropOverlay.addEventListener('touchstart', startDrag, { passive: false });
    
    // リサイズハンドルのドラッグ
    const handles = cropOverlay.querySelectorAll('.crop-handle');
    handles.forEach(handle => {
        function startResize(e) {
            const pointer = getPointerPosition(e);

            isResizing = true;
            resizeDirection = handle.className.split(' ')[1];

            const containerRect = cropContainer.getBoundingClientRect();
            dragStart.x = pointer.x - containerRect.left;
            dragStart.y = pointer.y - containerRect.top;

            e.preventDefault();
            e.stopPropagation();
        }

        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, { passive: false });
    });

    function handleMove(e) {
        const pointer = getPointerPosition(e);
        const containerRect = cropContainer.getBoundingClientRect();
        const imageRect = cropImage.getBoundingClientRect();

        if (isDragging) {
            const newLeft = pointer.x - containerRect.left - dragStart.x;
            const newTop = pointer.y - containerRect.top - dragStart.y;

            const maxLeft = imageRect.width - cropOverlay.offsetWidth;
            const maxTop = imageRect.height - cropOverlay.offsetHeight;

            cropOverlay.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
            cropOverlay.style.top = Math.max(0, Math.min(maxTop, newTop)) + 'px';

            e.preventDefault();
        } else if (isResizing) {
            const currentX = pointer.x - containerRect.left;
            const currentY = pointer.y - containerRect.top;

            const [ratioW, ratioH] = params.ratio.split(':').map(Number);
            const targetRatio = params.orient === 'portrait' ? ratioH / ratioW : ratioW / ratioH;

            let newWidth = cropOverlay.offsetWidth;
            let newHeight = cropOverlay.offsetHeight;
            let newLeft = parseFloat(cropOverlay.style.left);
            let newTop = parseFloat(cropOverlay.style.top);

            if (Number.isNaN(newLeft)) newLeft = 0;
            if (Number.isNaN(newTop)) newTop = 0;

            if (resizeDirection.includes('e')) {
                newWidth = currentX - newLeft;
            }
            if (resizeDirection.includes('w')) {
                newWidth = newLeft + newWidth - currentX;
                newLeft = currentX;
            }
            if (resizeDirection.includes('s')) {
                newHeight = currentY - newTop;
            }
            if (resizeDirection.includes('n')) {
                newHeight = newTop + newHeight - currentY;
                newTop = currentY;
            }

            // 比率を維持
            if (newWidth / newHeight > targetRatio) {
                newWidth = newHeight * targetRatio;
            } else {
                newHeight = newWidth / targetRatio;
            }

            // 境界チェック
            if (newLeft >= 0 && newTop >= 0 &&
                newLeft + newWidth <= imageRect.width &&
                newTop + newHeight <= imageRect.height &&
                newWidth >= 50 && newHeight >= 50) {

                cropOverlay.style.left = newLeft + 'px';
                cropOverlay.style.top = newTop + 'px';
                cropOverlay.style.width = newWidth + 'px';
                cropOverlay.style.height = newHeight + 'px';
            }

            e.preventDefault();
        }
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });

    function endInteraction() {
        isDragging = false;
        isResizing = false;
        resizeDirection = '';
    }

    document.addEventListener('mouseup', endInteraction);
    document.addEventListener('touchend', endInteraction);
    document.addEventListener('touchcancel', endInteraction);
}

/**
 * 手動切り取りを実行
 */
function executeCrop() {
    const cropImage = document.getElementById('cropImage');
    const cropOverlay = document.getElementById('cropOverlay');
    
    const imageRect = cropImage.getBoundingClientRect();
    
    const scaleX = originalImage.width / imageRect.width;
    const scaleY = originalImage.height / imageRect.height;
    
    cropData = {
        x: parseInt(cropOverlay.style.left) * scaleX,
        y: parseInt(cropOverlay.style.top) * scaleY,
        width: cropOverlay.offsetWidth * scaleX,
        height: cropOverlay.offsetHeight * scaleY
    };
    
    finalizeCrop();
}

/**
 * 切り取り完了後の処理
 */
async function finalizeCrop() {
    const cropArea = document.getElementById('cropArea');
    const errorAlert = document.getElementById('sizeErrorAlert');
    
    if (cropArea) cropArea.classList.add('d-none');
    if (errorAlert) errorAlert.classList.add('d-none');
    
    try {
        const canvas = await processImage(currentFile, params, true);
        const blob = await adjustFileSize(canvas, params.format, params.maxSize);
        
        const previewImage = document.getElementById('previewImage');
        previewImage.src = URL.createObjectURL(blob);
        previewImage.style.border = 'none';
        
        updateInfoPanel(currentFile, blob, params);
        setupDownloadButton(blob);
        
        showToast('切り取りが完了しました！');
        
    } catch (error) {
        showToast('切り取り処理に失敗しました', 'danger');
        console.error(error);
    }
}

/**
 * ダウンロードボタンを設定
 */
function setupDownloadButton(blob) {
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `converted_${currentFile.name.split('.')[0]}.${params.format}`;
            link.href = URL.createObjectURL(blob);
            link.click();
        };
    }
}

/**
 * ファイルサイズを調整
 */
function adjustFileSize(canvas, format, maxSizeKB) {
    return new Promise((resolve) => {
        const mimeType = format === 'png' ? 'image/png' : 
                        format === 'webp' ? 'image/webp' : 'image/jpeg';
        let quality = 0.9;
        
        function tryCompress() {
            canvas.toBlob((blob) => {
                const sizeKB = blob.size / 1024;
                
                if (sizeKB <= maxSizeKB || quality <= 0.1) {
                    resolve(blob);
                } else {
                    quality -= 0.1;
                    tryCompress();
                }
            }, mimeType, format === 'jpeg' ? quality : undefined);
        }
        
        tryCompress();
    });
}

/**
 * 情報パネルを更新
 */
function updateInfoPanel(originalFile, processedBlob, params) {
    const panel = document.getElementById('infoPanel');
    if (!panel) return;
    
    const originalSizeKB = Math.round(originalFile.size / 1024);
    const processedSizeKB = Math.round(processedBlob.size / 1024);
    const compressionRatio = Math.round((1 - processedBlob.size / originalFile.size) * 100);
    
    panel.innerHTML = `
        <strong>処理結果:</strong><br>
        元ファイル: ${originalSizeKB}KB → 変換後: ${processedSizeKB}KB (-${compressionRatio}%)<br>
        比率: ${params.ratio} (${params.orient})<br>
        形式: ${params.format.toUpperCase()}<br>
        サイズ上限: ${params.maxW}×${params.maxH}px, ${params.maxSize}KB
    `;
}

/**
 * URLパラメータを生成（generator用）
 */
function generateUrl() {
    const form = document.getElementById('paramForm');
    if (!form) return '';
    
    const formData = new FormData(form);
    
    const params = new URLSearchParams();
    const baseUrl = window.location.origin + window.location.pathname.replace('generator.html', 'index.html');
    
    const ratio = formData.get('ratio');
    if (ratio && ratio !== '16:9') params.set('ratio', ratio);
    
    const orient = formData.get('orient');
    if (orient && orient !== 'landscape') params.set('orient', orient);
    
    const maxSize = formData.get('maxSize');
    if (maxSize && maxSize !== '1000') params.set('maxSize', maxSize);
    
    const format = formData.get('format');
    if (format && format !== 'jpeg') params.set('format', format);
    
    const maxW = formData.get('maxW');
    if (maxW && maxW !== '1920') params.set('maxW', maxW);
    
    const maxH = formData.get('maxH');
    if (maxH && maxH !== '1080') params.set('maxH', maxH);
    
    const desc = formData.get('desc');
    if (desc && desc.trim()) params.set('desc', desc.trim());
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * URLを更新（generator用）
 */
function updateUrl() {
    const url = generateUrl();
    currentLongUrl = url;
    const generatedUrl = document.getElementById('generatedUrl');
    if (generatedUrl) {
        generatedUrl.value = url;
    }
}

/**
 * 画像比率に基づいて最大幅・最大高さを自動調整（generator用）
 */
function adjustMaxDimensions() {
    const form = document.getElementById('paramForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const ratio = formData.get('ratio');
    const orient = formData.get('orient');
    const maxWInput = document.getElementById('maxW');
    const maxHInput = document.getElementById('maxH');

    if (!ratio || !maxWInput || !maxHInput) return;

    const [ratioW, ratioH] = ratio.split(':').map(Number);
    const actualRatio = orient === 'portrait' ? ratioH / ratioW : ratioW / ratioH;
    
    const currentMaxW = parseInt(maxWInput.value) || 1920;
    const currentMaxH = parseInt(maxHInput.value) || 1080;
    
    const currentRatio = currentMaxW / currentMaxH;
    
    if (Math.abs(currentRatio - actualRatio) > 0.01) {
        if (currentMaxW / actualRatio <= 4000 && currentMaxW / actualRatio >= 100) {
            maxHInput.value = Math.round(currentMaxW / actualRatio);
        } else {
            maxWInput.value = Math.round(currentMaxH * actualRatio);
        }
    }
}

/**
 * 短縮URL作成処理（generator用）
 */
async function createShortUrl() {
    const form = document.getElementById('paramForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const createBtn = document.getElementById('createShortBtn');
    const btnText = document.getElementById('createBtnText');
    const spinner = document.getElementById('loadingSpinner');
    const resultSection = document.getElementById('resultSection');

    // ボタン状態変更
    createBtn.disabled = true;
    btnText.classList.add('d-none');
    spinner.classList.remove('d-none');

    try {
        const desc = formData.get('desc') || '';
        const expiredUrl = desc ?
            `${window.location.origin}/expired.html?desc=${encodeURIComponent(desc)}` :
            `${window.location.origin}/expired.html`;

        const requestBody = {
            domain: SHORT_IO_DOMAIN,
            originalURL: currentLongUrl,
            expiredURL: expiredUrl
        };

        if (desc) {
            requestBody.title = desc;
        }

        const slugType = formData.get('slugType');
        if (slugType && slugType !== 'auto') {
            requestBody.path = slugType;
        }

        const expiredHours = parseInt(formData.get('expiredHours'), 10) || 0;
        if (expiredHours > 0) {
            const expiresAt = new Date(Date.now() + expiredHours * 60 * 60 * 1000);
            requestBody.expiresAt = expiresAt.toISOString();
        }

        const response = await fetch(SHORT_IO_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': SHORT_IO_API_KEY
            },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        console.log('API Response:', responseData);

        if (response.ok && responseData.shortURL) {
            const shortUrl = responseData.secureShortURL || responseData.shortURL;
            const resolvedSlug = slugType === 'auto' ? (responseData.path || '自動生成') : slugType;

            resultSection.innerHTML = `
                <div class="alert alert-success" role="alert">
                    <h5 class="alert-heading">✅ 短縮URLの作成に成功しました！</h5>
                </div>
                <div class="card">
                    <div class="card-body text-center">
                        <div class="short-url mb-3">${shortUrl}</div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                            <button onclick="copyToClipboard('${shortUrl}')" class="btn btn-primary">
                                📋 短縮URLをコピー
                            </button>
                            <button onclick="window.open('${shortUrl}', '_blank')" class="btn btn-success">
                                🔗 短縮URLを開く
                            </button>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">設定詳細</h6>
                            <ul class="list-unstyled mb-0">
                                <li><strong>有効期限:</strong> ${expiredHours > 0 ? `${expiredHours}時間` : '無期限'}</li>
                                <li><strong>スラッグ:</strong> ${resolvedSlug}</li>
                                <li><strong>期限切れ後の転送先:</strong> <small>${expiredUrl}</small></li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            resultSection.classList.remove('d-none');
            showToast('短縮URLを作成しました！');
        } else {
            const errorMsg = responseData.message || responseData.error || responseData.code || 'エラーが発生しました';
            resultSection.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h5 class="alert-heading">❌ 短縮URLの作成に失敗しました</h5>
                    <p class="mb-3"><strong>エラー詳細:</strong> ${errorMsg}</p>
                    <button onclick="document.getElementById('resultSection').classList.add('d-none')" class="btn btn-outline-danger">
                        閉じる
                    </button>
                </div>
            `;
            resultSection.classList.remove('d-none');
            showToast('短縮URL作成に失敗しました', 'danger');
        }

    } catch (error) {
        console.error('Network Error:', error);
        resultSection.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5 class="alert-heading">❌ ネットワークエラーが発生しました</h5>
                <p class="mb-3"><strong>エラー詳細:</strong> ${error.message}</p>
                <button onclick="document.getElementById('resultSection').classList.add('d-none')" class="btn btn-outline-danger">
                    閉じる
                </button>
            </div>
        `;
        resultSection.classList.remove('d-none');
        showToast('ネットワークエラーが発生しました', 'danger');
    } finally {
        // ボタン状態復元
        createBtn.disabled = false;
        btnText.classList.remove('d-none');
        spinner.classList.add('d-none');
    }
}

/**
 * URLパラメータから説明を取得して表示（expired用）
 */
function displayDescription() {
    const urlParams = new URLSearchParams(window.location.search);
    const desc = urlParams.get('desc');
    
    if (desc && desc.trim()) {
        try {
            const decodedDesc = decodeURIComponent(desc);
            const descSection = document.getElementById('descriptionSection');
            const descText = document.getElementById('descriptionText');
            
            if (descSection && descText) {
                descText.textContent = decodedDesc;
                descSection.style.display = 'block';
            }
        } catch (error) {
            console.error('Description decode error:', error);
        }
    }
}

/**
 * クリップボードにコピー
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('コピーしました！');
    } catch (error) {
        showToast('コピーに失敗しました', 'danger');
        console.error(error);
    }
}

/**
 * トースト通知を表示
 */
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toastEl || !toastMessage) return;
    
    toastMessage.textContent = message;
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    
    if (toastInstance) {
        toastInstance.dispose();
    }
    toastInstance = new bootstrap.Toast(toastEl);
    toastInstance.show();
}

/**
 * Bootstrap関連の初期化
 */
function initBootstrap() {
    // Tooltipの初期化
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Popoverの初期化
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    const popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * パフォーマンス最適化のためのデバウンス関数
 */
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

/**
 * アニメーション効果の追加
 */
function addAnimationEffects() {
    // フェードインアニメーション
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // アニメーション対象要素を監視
    document.querySelectorAll('.card, .alert, .main-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

/**
 * エラーハンドリング
 */
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showToast('予期しないエラーが発生しました', 'danger');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    showToast('処理中にエラーが発生しました', 'danger');
});

/**
 * ユーティリティ関数
 */
const utils = {
    /**
     * ファイルサイズを人間が読みやすい形式に変換
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * 画像の実際の寸法を取得
     */
    getImageDimensions: function(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    ratio: img.naturalWidth / img.naturalHeight
                });
            };
            img.src = URL.createObjectURL(file);
        });
    },
    
    /**
     * 日時をフォーマット
     */
    formatDate: function(date) {
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
};

// ページロード完了後に追加の初期化処理を実行
window.addEventListener('load', function() {
    initBootstrap();
    addAnimationEffects();
    
    // パフォーマンス監視
    if ('performance' in window && 'measure' in performance) {
        performance.mark('page-loaded');
    }
});

// ページのvisibilityが変更された時の処理
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // ページが非表示になった時の処理
        console.log('Page hidden');
    } else {
        // ページが表示された時の処理
        console.log('Page visible');
    }
});

// オフライン/オンライン状態の監視
window.addEventListener('online', function() {
    showToast('インターネット接続が復旧しました', 'success');
});

window.addEventListener('offline', function() {
    showToast('インターネット接続が切断されました', 'warning');
});

/**
 * レスポンシブ対応のための処理
 */
function handleResize() {
    const isMobile = window.innerWidth < 768;
    
    // モバイル時の特別な処理があればここに記述
    if (isMobile) {
        // モバイル用の処理
        document.body.classList.add('mobile');
    } else {
        document.body.classList.remove('mobile');
    }
}

// リサイズイベントをデバウンスして処理
window.addEventListener('resize', debounce(handleResize, 250));

// 初回実行
handleResize();
