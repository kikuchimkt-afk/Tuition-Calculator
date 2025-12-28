// Default Pricing Data (Fallback - includes 7th element: seasonal/concentrated unit price)
const DEFAULT_PRICING = {
    "1:2": {
        "elem45": [9080, 17180, 24440, 30980, 36660, 41870, 2420],
        "elem80": [16090, 30490, 43440, 55060, 65220, 74420, 4235],
        "middle12": [17550, 33400, 47550, 60260, 71510, 81430, 4598],
        "middle3high12": [18510, 35090, 50090, 63280, 75140, 85670, 4840],
        "high3": [19360, 36910, 52510, 66550, 79010, 89900, 5082]
    },
    "1:1": {
        "elem45": [15850, 30130, 42830, 54210, 64370, 73450, 4235],
        "elem80": [28190, 53600, 76110, 96320, 114470, 130560, 7502],
        "middle12": [30730, 58320, 83130, 105270, 124990, 142420, 8107],
        "middle3high12": [32310, 61350, 87480, 110840, 131530, 149920, 8530],
        "high3": [33880, 64490, 91960, 116280, 138060, 157300, 8954]
    }
};

let PRICING = JSON.parse(JSON.stringify(DEFAULT_PRICING)); // Mutable Pricing Object

const ENTRANCE_FEES = {
    elem: 11000,
    middle_high: 22000
};

const ADJUSTMENT_UNIT_PRICES = {
    "elem45": 4840,
    "elem80": 4840,
    "middle12": 4840,
    "middle3high12": 4840,
    "high3": 4840
};

const CONFIG_KEY = 'tuition_config';
const PRICING_KEY = 'tuition_pricing';
const CUSTOM_DEFAULT_KEY = 'tuition_pricing_default';

const DEFAULT_CONFIG = {
    company: 'ECCベストワン・ジュニア藍住',
    zip: '771-1252',
    address: '徳島県板野郡藍住町矢上字北分82-1\nテナント新居No.4',
    phone: '088-692-5483',
    invoice: '',
    logo: '',
    bank: 'ゆうちょ銀行\n16210-153351\n名義）犬伏由美'
};

// Seasonal Pricing (Base Tiers for reference/offset calculation)
const SEASONAL_PRICING_BASE = {
    "1:2": {
        "elem45": [2420, 2360, 2300, 2240, 2180],
        "elem80": [4235, 4170, 4110, 4050, 3990],
        "middle12": [4598, 4540, 4480, 4420, 4360],
        "middle3high12": [4840, 4780, 4720, 4660, 4600],
        "high3": [5082, 5020, 4960, 4900, 4840]
    },
    "1:1": {
        "elem45": [4235, 4170, 4110, 4050, 3990],
        "elem80": [7502, 7440, 7380, 7320, 7260],
        "middle12": [8107, 8050, 7990, 7930, 7870],
        "middle3high12": [8530, 8470, 8410, 8350, 8290],
        "high3": [8954, 8890, 8830, 8770, 8710]
    }
};

// Helper to get price for total slots based on base unit price
function getSeasonalUnitPrice(ratio, grade, totalSlots, baseUnitPrice) {
    const defaultTiers = SEASONAL_PRICING_BASE[ratio][grade];
    if (!defaultTiers) return baseUnitPrice;

    const defaultBase = defaultTiers[0];
    const offset = baseUnitPrice - defaultBase;

    let tierIndex = 0;
    if (totalSlots > 50) tierIndex = 4;
    else if (totalSlots > 40) tierIndex = 3;
    else if (totalSlots > 30) tierIndex = 2;
    else if (totalSlots > 20) tierIndex = 1;

    return defaultTiers[tierIndex] + offset;
}

const SEASONAL_SUBJECTS = ['数学', '英語', '国語', '理科', '社会'];

let userConfig = { ...DEFAULT_CONFIG };
let state = {
    docType: 'estimate',
    grade: 'middle12',
    ratio: '1:2',
    count: 0,
    subjects: [],
    adjustment: false,
    entranceType: 'full',
    seasonal: {},
    calc: {
        tuition: 0, utility: 0, adjustment: 0,
        entranceBase: 0, entranceDiscount: 0, entranceFinal: 0,
        material: 0, seasonalSlots: 0, seasonalUnit: 0, seasonalCost: 0,
        monthlyTotal: 0, oneTimeTotal: 0, grandTotal: 0
    }
};

const els = {};

function init() {
    loadConfig();
    loadPricing(); // Load custom pricing

    // Toggles (Grouped by selector)
    els.docTypeBtns = document.querySelectorAll('#doc-type-selector .toggle-btn');
    els.ratioBtns = document.querySelectorAll('#ratio-selector .toggle-btn');

    // Selects & Inputs (Corrected IDs)
    els.gradeSelect = document.getElementById('grade-selector');
    els.adjustmentCheck = document.getElementById('adjustment-fee');
    // els.materialInput removed (Original)
    els.manualMaterialInput = document.getElementById('manual-material-fee');
    els.entranceRadios = document.getElementsByName('entrance-fee');

    // Set default deadline (1 week)
    const deadlineInput = document.getElementById('transfer-deadline');
    if (deadlineInput) {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        deadlineInput.valueAsDate = d;
    }

    // Subjects
    els.subjectButtons = document.querySelectorAll('.subject-btn');
    els.selectedSubjectsContainer = document.getElementById('selected-list');
    els.weekCountDisplay = document.getElementById('week-count-display');

    // Config Panel (Corrected IDs)
    els.configModal = document.getElementById('config-modal');
    els.openConfigBtn = document.getElementById('open-config-btn');
    els.closeConfigBtn = document.getElementById('close-config-btn');
    els.saveConfigBtn = document.getElementById('save-config-btn');
    els.logoInput = document.getElementById('logo-input');
    els.clearLogoBtn = document.getElementById('logo-clear-btn');

    // Pricing Modal Inputs
    els.pricingModal = document.getElementById('pricing-modal');
    els.openPricingBtn = document.getElementById('open-pricing-btn');
    els.closePricingBtn = document.getElementById('close-pricing-btn');
    els.savePricingBtn = document.getElementById('save-pricing-btn');
    els.resetPricingBtn = document.getElementById('reset-pricing-btn');

    // Data Inputs
    els.studentNameInput = document.getElementById('student-name');
    els.generateBtn = document.getElementById('generate-btn');

    // Outputs
    els.monthlyTuition = document.getElementById('monthly-tuition');
    els.utilityFee = document.getElementById('utility-fee');
    els.monthlyTotal = document.getElementById('monthly-total');
    els.entranceFeeDisplay = document.getElementById('entrance-fee-display');

    renderSeasonalInputs();
    setupListeners();
    updateCalculations();
}

function loadConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        // Base config is defaults
        userConfig = { ...DEFAULT_CONFIG };

        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge saved on top, BUT if saved value is empty and default has value, keep default
            Object.keys(parsed).forEach(key => {
                if (parsed[key] === '' && DEFAULT_CONFIG[key]) {
                    // Saved is empty, Default has value -> Keep Default (do nothing, as userConfig already has Default)
                } else {
                    // Otherwise use saved (even if saved is something else)
                    userConfig[key] = parsed[key];
                }
            });
        }

        // Update UI
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        setVal('cfg-company', userConfig.company);
        setVal('cfg-zip', userConfig.zip);
        setVal('cfg-address', userConfig.address);
        setVal('cfg-phone', userConfig.phone);
        setVal('cfg-invoice', userConfig.invoice);
        setVal('cfg-bank', userConfig.bank);

        if (userConfig.logo && document.getElementById('logo-preview')) {
            document.getElementById('logo-preview').src = userConfig.logo;
            document.getElementById('logo-preview').classList.remove('hidden');
            if (document.getElementById('logo-clear-btn')) document.getElementById('logo-clear-btn').classList.remove('hidden');
        }

    } catch (e) {
        console.error("Failed to load config", e);
    }
}

function loadPricing() {
    try {
        const saved = localStorage.getItem(PRICING_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Validation: Check if it has 7 elements, if not (legacy data), migrate
            if (parsed["1:2"]["elem45"].length < 7) {
                console.log("Legacy pricing data detected. Migrating...");
                PRICING = JSON.parse(JSON.stringify(DEFAULT_PRICING));

                // Append defaults to existing data if possible, but simpler to just use defaults + user values where possible?
                // Actually, let's just append the default 7th column to the user's existing 6 columns.
                Object.keys(parsed).forEach(ratio => {
                    if (DEFAULT_PRICING[ratio]) {
                        Object.keys(parsed[ratio]).forEach(grade => {
                            if (parsed[ratio][grade] && parsed[ratio][grade].length === 6 && DEFAULT_PRICING[ratio][grade]) {
                                parsed[ratio][grade].push(DEFAULT_PRICING[ratio][grade][6]);
                            }
                        });
                    }
                });
                PRICING = parsed;
                localStorage.setItem(PRICING_KEY, JSON.stringify(PRICING));
            } else {
                PRICING = parsed;
            }
        } else {
            PRICING = JSON.parse(JSON.stringify(DEFAULT_PRICING));
        }
    } catch (e) {
        console.error("Failed to load pricing", e);
        PRICING = JSON.parse(JSON.stringify(DEFAULT_PRICING));
    }
}

function saveConfig() {
    const getVal = (id) => document.getElementById(id)?.value || '';
    userConfig.company = getVal('cfg-company');
    userConfig.zip = getVal('cfg-zip');
    userConfig.address = getVal('cfg-address');
    userConfig.phone = getVal('cfg-phone');
    userConfig.invoice = getVal('cfg-invoice');
    userConfig.bank = getVal('cfg-bank');

    localStorage.setItem(CONFIG_KEY, JSON.stringify(userConfig));
    els.configModal.classList.remove('open');
    updateCalculations();
}

// Pricing Functions
function renderPricingModal() {
    const gradeLabels = {
        "elem45": "小学生(45分)",
        "elem80": "小学生(80分)",
        "middle12": "中1・2",
        "middle3high12": "中3・高1・2",
        "high3": "高3・既卒"
    };

    const renderTable = (ratio, tableId) => {
        const tbody = document.querySelector(`#${tableId} tbody`);
        const theadTr = document.querySelector(`#${tableId} thead tr`);

        // Ensure header has 1コマ単価 (Check if already added)
        // Reset header first to ensure clean state
        if (theadTr) {
            // Reset to base cols
            theadTr.innerHTML = `
                <th>対象</th>
                <th>分/コマ</th>
                <th>週1コマ</th>
                <th>週2コマ</th>
                <th>週3コマ</th>
                <th>週4コマ</th>
                <th>週5コマ</th>
                <th>週6コマ</th>
                <th>1コマ単価</th>
             `;
        }

        if (!tbody) return;
        tbody.innerHTML = '';

        Object.keys(PRICING[ratio]).forEach(gradeKey => {
            const row = document.createElement('tr');
            const prices = PRICING[ratio][gradeKey];
            const duration = (gradeKey === 'elem45') ? 45 : 80;

            let html = `<td>${gradeLabels[gradeKey]}</td><td>${duration}</td>`;

            prices.forEach((price, idx) => {
                html += `<td><input type="number" value="${price}" data-ratio="${ratio}" data-grade="${gradeKey}" data-index="${idx}"></td>`;
            });
            row.innerHTML = html;
            tbody.appendChild(row);
        });
    };

    renderTable("1:2", "pricing-table-1-2");
    renderTable("1:1", "pricing-table-1-1");
}

function savePricing() {
    const inputs = document.querySelectorAll('.pricing-edit-table input');

    inputs.forEach(input => {
        const ratio = input.dataset.ratio;
        const grade = input.dataset.grade;
        const index = parseInt(input.dataset.index);
        const val = parseInt(input.value) || 0;

        if (PRICING[ratio] && PRICING[ratio][grade]) {
            PRICING[ratio][grade][index] = val;
        }
    });

    localStorage.setItem(PRICING_KEY, JSON.stringify(PRICING));
    els.pricingModal.classList.remove('open');
    alert('授業料設定を保存しました。');
    updateCalculations();
}

function setDefaultPricing() {
    if (confirm('現在の設定値を「デフォルト（復元ポイント）」として登録しますか？\\n\\n「デフォルトに戻す」ボタンを押した際に、この値に戻るようになります。')) {
        // Save current UI state first
        const inputs = document.querySelectorAll('.pricing-edit-table input');
        inputs.forEach(input => {
            const ratio = input.dataset.ratio;
            const grade = input.dataset.grade;
            const index = parseInt(input.dataset.index);
            const val = parseInt(input.value) || 0;
            if (PRICING[ratio] && PRICING[ratio][grade]) {
                PRICING[ratio][grade][index] = val;
            }
        });

        localStorage.setItem(CUSTOM_DEFAULT_KEY, JSON.stringify(PRICING));
        alert('現在の設定をデフォルトとして登録しました。');
    }
}

function resetPricing() {
    if (confirm('現在編集中の内容を破棄し、デフォルト設定に戻しますか？')) {
        const savedDefault = localStorage.getItem(CUSTOM_DEFAULT_KEY);
        if (savedDefault) {
            PRICING = JSON.parse(savedDefault);
            console.log("Restored from Custom Default");
        } else {
            PRICING = JSON.parse(JSON.stringify(DEFAULT_PRICING));
            console.log("Restored from System Default");
        }

        localStorage.setItem(PRICING_KEY, JSON.stringify(PRICING));
        renderPricingModal();
        updateCalculations();
        alert('デフォルト設定に戻しました。');
    }
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            userConfig.logo = evt.target.result;
            const preview = document.getElementById('logo-preview');
            const clearBtn = document.getElementById('logo-clear-btn');
            if (preview) {
                preview.src = userConfig.logo;
                preview.classList.remove('hidden');
            }
            if (clearBtn) clearBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function clearLogo() {
    userConfig.logo = '';
    const preview = document.getElementById('logo-preview');
    const input = document.getElementById('logo-input');
    const clearBtn = document.getElementById('logo-clear-btn');
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
}

function renderSeasonalInputs() {
    const container = document.getElementById('seasonal-inputs');
    if (!container) return;
    container.innerHTML = '';

    SEASONAL_SUBJECTS.forEach(subj => {
        const div = document.createElement('div');
        div.className = 'seasonal-input-group';
        div.innerHTML = `
            <span class="seasonal-label">${subj}</span>
            <div class="stepper">
                <button type="button" class="stepper-btn minus" data-subj="${subj}">-</button>
                <input type="number" class="stepper-val seasonal-input" id="val-${subj}" value="0" min="0" data-subj="${subj}">
                <button type="button" class="stepper-btn plus" data-subj="${subj}">+</button>
            </div>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('.minus').forEach(b => b.addEventListener('click', () => changeSeasonal(b.dataset.subj, -1)));
    container.querySelectorAll('.plus').forEach(b => b.addEventListener('click', () => changeSeasonal(b.dataset.subj, 1)));

    container.querySelectorAll('.seasonal-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 0;
            setSeasonal(e.target.dataset.subj, val);
        });
        input.addEventListener('focus', (e) => e.target.select());
    });
}

function setSeasonal(subj, val) {
    if (!state.seasonal) state.seasonal = {};
    const next = Math.max(0, val);
    state.seasonal[subj] = next;

    const input = document.getElementById(`val-${subj}`);
    if (input && parseInt(input.value) !== next) {
        input.value = next;
    }
    updateCalculations();
}

function changeSeasonal(subj, delta) {
    if (!state.seasonal) state.seasonal = {};
    const current = state.seasonal[subj] || 0;
    const next = Math.max(0, current + delta);
    setSeasonal(subj, next);
}

function setupListeners() {
    // Grade
    if (els.gradeSelect) {
        els.gradeSelect.addEventListener('change', (e) => {
            state.grade = e.target.value;
            updateCalculations();
            updateAdjustmentLabel();
        });
    }

    // Doc Type
    if (els.docTypeBtns) {
        els.docTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                els.docTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.docType = btn.dataset.value;
            });
        });
    }

    // Ratio
    if (els.ratioBtns) {
        els.ratioBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                els.ratioBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.ratio = btn.dataset.value;
                updateCalculations();
            });
        });
    }

    // Subjects
    if (els.subjectButtons) {
        els.subjectButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const subj = btn.dataset.subject;
                state.subjects.push(subj);
                state.count = state.subjects.length;
                updateSubjectUI();
                updateCalculations();
            });
        });
    }

    // Remove Subject Delegate
    const summaryDiv = document.querySelector('.selected-summary');
    if (summaryDiv) {
        summaryDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-remove')) {
                const idx = parseInt(e.target.dataset.index);
                state.subjects.splice(idx, 1);
                state.count = state.subjects.length;
                updateSubjectUI();
                updateCalculations();
            }
        });
    }

    // Adjustment
    if (els.adjustmentCheck) {
        els.adjustmentCheck.addEventListener('change', (e) => {
            state.adjustment = e.target.checked;
            updateCalculations();
        });
    }

    // Entrance
    if (els.entranceRadios) {
        Array.from(els.entranceRadios).forEach(r => {
            r.addEventListener('change', (e) => {
                if (e.target.checked) {
                    state.entranceType = e.target.value;
                    updateCalculations();
                }
            });
        });
    }

    // Material
    if (els.manualMaterialInput) els.manualMaterialInput.addEventListener('input', updateCalculations);

    // Config & App
    if (els.openConfigBtn) els.openConfigBtn.addEventListener('click', () => els.configModal.classList.add('open'));
    if (els.closeConfigBtn) els.closeConfigBtn.addEventListener('click', () => els.configModal.classList.remove('open'));
    if (els.saveConfigBtn) els.saveConfigBtn.addEventListener('click', saveConfig);
    if (els.logoInput) els.logoInput.addEventListener('change', handleLogoUpload);
    if (els.clearLogoBtn) els.clearLogoBtn.addEventListener('click', clearLogo);

    // Pricing Config
    if (els.openPricingBtn) els.openPricingBtn.addEventListener('click', () => {
        renderPricingModal();
        els.pricingModal.classList.add('open');
    });
    if (els.closePricingBtn) els.closePricingBtn.addEventListener('click', () => els.pricingModal.classList.remove('open'));
    if (els.savePricingBtn) els.savePricingBtn.addEventListener('click', savePricing);
    if (els.resetPricingBtn) els.resetPricingBtn.addEventListener('click', resetPricing);

    // Custom Defaults setup
    const defaultBtn = document.getElementById('set-default-btn');
    if (defaultBtn) defaultBtn.addEventListener('click', setDefaultPricing);

    if (els.generateBtn) els.generateBtn.addEventListener('click', generateEstimate);
}

function updateSubjectUI() {
    const listEl = document.getElementById('selected-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    state.subjects.forEach((subj, idx) => {
        const tag = document.createElement('span');
        tag.className = 'subject-tag';
        tag.style.display = 'inline-flex';
        tag.style.alignItems = 'center';
        tag.style.marginRight = '5px';
        tag.style.padding = '2px 8px';
        tag.style.backgroundColor = '#e0f2fe';
        tag.style.borderRadius = '12px';
        tag.style.fontSize = '0.9em';

        tag.innerHTML = `${subj} <button class="tag-remove" data-index="${idx}" style="border:none;background:none;color:#ef4444;margin-left:5px;cursor:pointer;font-weight:bold;">×</button>`;
        listEl.appendChild(tag);
    });

    if (els.weekCountDisplay) els.weekCountDisplay.textContent = state.count;
}

function updateAdjustmentLabel() {
}

function updateCalculations() {
    // 1. Tuition
    const countIdx = Math.max(0, Math.min(6, state.count));
    // Use stored PRICING object instead of constant
    const basePrices = PRICING[state.ratio][state.grade];
    const tuition = (countIdx > 0 && countIdx <= 6) ? basePrices[countIdx - 1] : 0;

    // 2. Utility
    const utility = 3600;

    // 3. Adjustment
    const adjUnit = ADJUSTMENT_UNIT_PRICES[state.grade] || 4840;
    const adjustmentTotal = state.adjustment ? adjUnit : 0;

    // 4. Entrance
    let entranceBase = (state.grade.startsWith('elem')) ? ENTRANCE_FEES.elem : ENTRANCE_FEES.middle_high;
    let entranceFinal = entranceBase;
    let entranceDiscount = 0;

    if (state.entranceType === 'half') {
        entranceDiscount = entranceBase / 2;
        entranceFinal = entranceBase / 2;
    }
    if (state.entranceType === 'waived') {
        entranceDiscount = entranceBase;
        entranceFinal = 0;
    }

    // 5. Material
    const materialFee = els.manualMaterialInput ? (parseInt(els.manualMaterialInput.value) || 0) : 0;

    // 6. Seasonal
    let seasonalTotalSlots = 0;
    if (state.seasonal) {
        Object.values(state.seasonal).forEach(c => seasonalTotalSlots += c);
    }

    // Get Base Unit Price from PRICING (column 7 / index 6)
    const storedPricing = PRICING[state.ratio][state.grade];
    const userBaseUnitPrice = (storedPricing && storedPricing.length > 6) ? storedPricing[6] : 0;

    // Calculate final unit price (applying tiers based on offset from default)
    const seasonalUnitPrice = getSeasonalUnitPrice(state.ratio, state.grade, seasonalTotalSlots, userBaseUnitPrice);
    const seasonalTotalCost = seasonalTotalSlots * seasonalUnitPrice;

    // Campaign: Seasonal Fee Waiver
    // If entrance fee is NOT waived (paid > 0), seasonal fee is waived.
    let seasonalDiscount = 0;
    if (entranceFinal > 0 && seasonalTotalCost > 0) {
        seasonalDiscount = seasonalTotalCost;
    }

    // UI Updates
    document.getElementById('seasonal-total-slots').textContent = seasonalTotalSlots;
    document.getElementById('seasonal-unit-price').textContent = seasonalUnitPrice.toLocaleString();

    // Tier Bar
    const tierFill = document.getElementById('tier-fill');
    const tierHint = document.getElementById('tier-hint');
    if (tierFill && tierHint) {
        let progress = Math.min(100, (seasonalTotalSlots / 55) * 100);
        tierFill.style.width = `${progress}%`;

        let nextTier = 0;
        if (seasonalTotalSlots <= 20) nextTier = 21;
        else if (seasonalTotalSlots <= 30) nextTier = 31;
        else if (seasonalTotalSlots <= 40) nextTier = 41;
        else if (seasonalTotalSlots <= 50) nextTier = 51;

        if (nextTier > 0) {
            tierHint.textContent = `あと ${nextTier - seasonalTotalSlots} コマで単価ダウン`;
        } else {
            tierHint.textContent = "最安単価適用中";
        }
    }

    // Sidebar Totals
    if (els.monthlyTuition) els.monthlyTuition.textContent = `${tuition.toLocaleString()}円`;

    // Adjustment Fee Row Logic
    const adjRow = document.getElementById('adjustment-fee-row');
    const adjDisplay = document.getElementById('adjustment-fee-display');
    if (adjRow && adjDisplay) {
        if (adjustmentTotal > 0) {
            adjRow.style.display = 'flex';
            adjDisplay.textContent = `${adjustmentTotal.toLocaleString()}円`;
        } else {
            adjRow.style.display = 'none';
        }
    }

    if (els.utilityFee) els.utilityFee.textContent = `${utility.toLocaleString()}円`;
    if (els.monthlyTotal) els.monthlyTotal.textContent = `${(tuition + adjustmentTotal + utility).toLocaleString()}円`;
    if (els.entranceFeeDisplay) els.entranceFeeDisplay.textContent = `${entranceFinal.toLocaleString()}円`;

    // State Update
    state.calc = {
        tuition, utility, adjustment: adjustmentTotal,
        entranceBase, entranceDiscount, entranceFinal,
        material: materialFee,
        seasonalSlots: seasonalTotalSlots, seasonalUnit: seasonalUnitPrice, seasonalCost: seasonalTotalCost,
        seasonalDiscount, // New property
        monthlyTotal: (tuition + adjustmentTotal + utility),
        oneTimeTotal: (entranceFinal + materialFee + seasonalTotalCost - seasonalDiscount),
        grandTotal: (tuition + adjustmentTotal + utility) + entranceFinal + materialFee + seasonalTotalCost - seasonalDiscount
    };
}

function generateEstimate() {
    // Update Date & ID
    const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('print-date').textContent = dateStr;
    document.getElementById('estimate-id').textContent = Math.floor(100000 + Math.random() * 900000);

    // Title & Intro Logic
    const titleEl = document.querySelector('.title-block h1');
    const recipientP = document.querySelector('.recipient-section p');
    const deadlineInput = document.getElementById('transfer-deadline');
    let deadlineDateStr = '';
    let showDeadline = false;

    if (deadlineInput && deadlineInput.value) {
        const d = new Date(deadlineInput.value);
        if (!isNaN(d.getTime())) {
            deadlineDateStr = d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
            showDeadline = true;
        }
    }

    if (state.docType === 'invoice') {
        titleEl.textContent = '授業料 御見積書 兼 御請求書';
        let html = `この度は、ベストワンへのお問い合わせ誠にありがとうございます。<br>
以下の通り、授業料のお見積もりを申し上げます。<br>
本状は初回納入金の請求書を兼ねております。ご入会の際は、下記期限までにお手続きをお願いいたします。<br>`;

        if (showDeadline) {
            html += `<span style="font-weight: bold; color: #e11d48; display: inline-block; margin-top: 5px;">
                        初回お振込期限： ${deadlineDateStr}
                     </span>`;
        }
        recipientP.innerHTML = html;

    } else {
        // Estimate
        titleEl.textContent = '授業料 御見積書';
        let html = `この度は、ベストワンへのお問い合わせ誠にありがとうございます。<br>
以下の通り、授業料のお見積もりを申し上げます。<br>
内容をご確認の上、ご検討いただきますようお願い申し上げます。<br>`;

        if (showDeadline) {
            html += `<span style="font-weight: bold; color: #e11d48; display: inline-block; margin-top: 5px;">
                        お返事期限： ${deadlineDateStr}
                     </span>`;
        }
        recipientP.innerHTML = html;
    }

    // Student Name
    const sName = els.studentNameInput.value.trim() || "______";
    document.getElementById('print-student-name').textContent = sName + " 様";

    // Table Body
    const tbody = document.getElementById('print-table-body');
    tbody.innerHTML = '';

    // Clear Footer
    const tfoot = document.querySelector('.estimate-table tfoot');
    if (tfoot) tfoot.innerHTML = '';

    const addRow = (item, detail, unit, price, isNegative) => {
        const tr = document.createElement('tr');
        const priceStr = (isNegative ? '▲ ' : '') + price.toLocaleString() + '円';
        tr.innerHTML = `
            <td>${item}</td>
            <td>${detail}</td>
            <td>${(typeof unit === 'number') ? unit.toLocaleString() + '円' : unit}</td>
            <td style="${isNegative ? 'color:red;' : ''}">${priceStr}</td>
        `;
        tbody.appendChild(tr);
    };

    const addTotalRow = (label, price, isHighlight = false) => {
        const tr = document.createElement('tr');
        tr.className = 'summary-row';
        if (isHighlight) {
            tr.classList.add('highlight');
            tr.style.fontSize = '1.2rem';
            tr.style.backgroundColor = '#fff3e0';
        } else {
            tr.style.backgroundColor = '#f9fafb';
        }

        tr.innerHTML = `
            <td colspan="3">${label}</td>
            <td>${price.toLocaleString()}円</td>
        `;
        tbody.appendChild(tr);
    };

    // 1. Monthly
    const subjStr = state.subjects.length > 0 ? `(${state.subjects.join('/')})` : '';
    const gradeMap = {
        "elem45": "小学生(45分)",
        "elem80": "小学生(80分)",
        "middle12": "中学1・2生",
        "middle3high12": "中3・高1・2",
        "high3": "高3・既卒"
    };

    const desc = `${gradeMap[state.grade] || state.grade} / ${state.ratio} / 週${state.count}回 ${subjStr}`;

    if (state.count > 0) {
        addRow('授業料', desc, state.calc.tuition, state.calc.tuition);
    }
    if (state.calc.adjustment > 0) {
        addRow('授業調整費', '指定・優先予約権', state.calc.adjustment, state.calc.adjustment);
    }
    if (state.count > 0 || state.calc.seasonalSlots > 0) {
        addRow('諸経費', 'システム管理費・設備費として', 3600, 3600);
    }
    addTotalRow('月額授業料 合計', state.calc.monthlyTotal);

    // 2. One-time
    if (state.calc.seasonalSlots > 0) {
        let details = [];
        for (const [k, v] of Object.entries(state.seasonal)) {
            if (v > 0) details.push(`${k}:${v}`);
        }
        const sDetail = `季節講習 計${state.calc.seasonalSlots}コマ (${details.join(', ')})`;
        addRow('季節講習費', sDetail, state.calc.seasonalUnit, state.calc.seasonalCost);

        if (state.calc.seasonalDiscount > 0) {
            addRow('季節講習費免除', '入学特典', '全額免除', state.calc.seasonalDiscount, true);
        }
    }

    if (state.entranceType !== 'waived') {
        addRow('入学金', '新規入会', state.calc.entranceBase, state.calc.entranceBase);
        if (state.entranceType === 'half') {
            addRow('入学金免除', '半額免除特典', '', state.calc.entranceDiscount, true);
        }
    } else {
        addRow('入学金', '新規入会', state.calc.entranceBase, state.calc.entranceBase);
        addRow('入学金免除', '全額免除特典', '', state.calc.entranceDiscount, true);
    }

    if (state.calc.material > 0) {
        addRow('教材費', '通年テキスト代', state.calc.material, state.calc.material);
    }

    addTotalRow('入会時諸費用 合計 (入学金・季節講習・教材費)', state.calc.oneTimeTotal);

    // 3. Grand Total
    addTotalRow('初回お振込金額 合計', state.calc.grandTotal, true);

    // Company & Bank
    const companyContainer = document.getElementById('print-company-info-container');
    let logoHtml = userConfig.logo ? `<img src="${userConfig.logo}" style="max-height: 80px; margin-bottom: 10px;">` : '';
    const bankHtml = (userConfig.bank || '').replace(/\n/g, '<br>');

    // Build Company Info HTML
    const company = userConfig.company || 'ECCベストワン';
    const zip = userConfig.zip ? `〒${userConfig.zip}` : '';
    const address = userConfig.address || '';
    const phone = userConfig.phone ? `TEL: ${userConfig.phone}` : '';
    const invoice = userConfig.invoice ? `登録番号: ${userConfig.invoice}` : '';

    if (companyContainer) {
        // Logo placed first to appear on top
        companyContainer.innerHTML = `
            ${logoHtml}
            <div class="header-company-text">
                <h3>${company}</h3>
                <div>${zip}</div>
                <div>${address.replace(/\n/g, '<br>')}</div>
                <div>${phone}</div>
                ${invoice ? `<div>${invoice}</div>` : ''}
            </div>
        `;
    }

    const remarksSection = document.querySelector('.remarks-section');
    const existingBank = document.getElementById('print-bank-info');
    if (existingBank) existingBank.remove();

    const bankDiv = document.createElement('div');
    bankDiv.id = 'print-bank-info';
    bankDiv.style.marginTop = '10px'; /* Compact */
    bankDiv.style.paddingTop = '5px';
    bankDiv.style.borderTop = '1px dashed #ccc';
    bankDiv.style.fontSize = '8.5pt'; /* Smaller */
    bankDiv.innerHTML = `
        <strong>【お振込先】</strong>
        <div style="margin-top: 3px; line-height: 1.3;">${bankHtml}</div>
    `;
    remarksSection.appendChild(bankDiv);

    window.print();
}

document.addEventListener('DOMContentLoaded', init);
