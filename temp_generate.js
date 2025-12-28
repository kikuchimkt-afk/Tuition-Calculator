function generateEstimate() {
    // Fill Print Sheet
    const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('print-date').textContent = dateStr;
    document.getElementById('estimate-id').textContent = Math.floor(100000 + Math.random() * 900000); // Random ID

    // Set Title based on Doc Type
    const titleEl = document.querySelector('.title-block h1');
    if (state.docType === 'invoice') {
        titleEl.textContent = '授業料 御請求書';
    } else {
        titleEl.textContent = '授業料 御見積書';
    }

    const sName = els.studentNameInput.value.trim() || "______";
    document.getElementById('print-student-name').textContent = sName + " 様";

    const tbody = document.getElementById('print-table-body');
    tbody.innerHTML = '';

    // Clear Footer logic (we use tbody for everything now)
    const tfoot = document.querySelector('.estimate-table tfoot');
    if (tfoot) tfoot.innerHTML = '';

    // Helper to add row
    const addRow = (item, detail, unit, price, isNegative) => {
        const tr = document.createElement('tr');
        const priceStr = (isNegative ? '▲ ' : '') + price.toLocaleString() + '円';
        tr.innerHTML = `
            <td>${item}</td>
            <td>${detail}</td>
            <td>${typeof unit === 'number' ? unit.toLocaleString() + '円' : unit}</td>
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

    // --- 1. Monthly Items ---
    const subjStr = state.subjects.length > 0 ? `(${state.subjects.join('/')})` : '';
    const gradeMap = {
        "elem45": "小学生(45分)",
        "elem80": "小学生(80分)",
        "middle12": "中学1・2生",
        "middle3high12": "中3・高1・2",
        "high3": "高3・既卒"
    };

    const desc = `${gradeMap[state.grade] || state.grade} / ${state.ratio} / 週${state.count}回 ${subjStr}`;

    // Tuition
    if (state.count > 0) {
        addRow('授業料', desc, state.calc.tuition, state.calc.tuition);
    }

    // Adjustment
    if (state.calc.adjustment > 0) {
        addRow('授業調整費', '指定・優先予約権', state.calc.adjustment, state.calc.adjustment);
    }

    // Utility
    if (state.count > 0 || state.calc.seasonalSlots > 0) {
        addRow('諸経費', 'システム管理費・設備費として', 3600, 3600);
    }

    // -> Monthly Subtotal
    addTotalRow('月額授業料 合計', state.calc.monthlyTotal);


    // --- 2. One-time Items ---

    // Seasonal
    if (state.calc.seasonalSlots > 0) {
        let details = [];
        for (const [k, v] of Object.entries(state.seasonal)) {
            if (v > 0) details.push(`${k}:${v}`);
        }
        const sDetail = `季節講習 計${state.calc.seasonalSlots}コマ (${details.join(', ')})`;
        addRow('季節講習費', sDetail, state.calc.seasonalUnit, state.calc.seasonalCost);
    }

    // Entrance
    if (state.entranceType !== 'waived') {
        addRow('入学金', '新規入会', state.calc.entranceBase, state.calc.entranceBase);
        if (state.entranceType === 'half') {
            addRow('入学金免除', '半額免除特典', '', state.calc.entranceDiscount, true);
        }
    } else {
        // Waived
        addRow('入学金', '新規入会', state.calc.entranceBase, state.calc.entranceBase);
        addRow('入学金免除', '全額免除特典', '', state.calc.entranceBase, true);
    }

    // Material
    if (state.calc.material > 0) {
        addRow('教材費', '通年テキスト代', state.calc.material, state.calc.material);
    }

    // -> One-time Subtotal
    addTotalRow('入会時諸費用 合計 (入学金・季節講習・教材費)', state.calc.oneTimeTotal);


    // --- 3. Grand Total ---
    addTotalRow('初回お振込金額 合計', state.calc.grandTotal, true);


    // Inject Company Info
    const companyInfoDiv = document.querySelector('.company-info');
    let logoHtml = userConfig.logo ? `<img src="${userConfig.logo}" style="max-height: 50px; margin-bottom: 10px;">` : '';
    const bankHtml = (userConfig.bank || '').replace(/\n/g, '<br>');

    companyInfoDiv.innerHTML = `
        ${logoHtml}
        <h3>${userConfig.company || 'ECCベストワン'}</h3>
        <p>〒${userConfig.zip || ''}<br>${userConfig.address || ''}</p>
        <p>TEL: ${userConfig.phone || ''}</p>
        ${userConfig.invoice ? `<p>登録番号: ${userConfig.invoice}</p>` : ''}
    `;

    // Add Bank Info
    const remarksSection = document.querySelector('.remarks-section');
    const existingBank = document.getElementById('print-bank-info');
    if (existingBank) existingBank.remove();

    const bankDiv = document.createElement('div');
    bankDiv.id = 'print-bank-info';
    bankDiv.style.marginTop = '20px';
    bankDiv.style.borderTop = '1px solid #eee';
    bankDiv.style.paddingTop = '10px';
    bankDiv.innerHTML = `
        <strong>【お振込先】</strong><br>
        <div style="font-size: 0.9rem; margin-top: 5px;">${bankHtml}</div>
    `;
    remarksSection.appendChild(bankDiv);

    // Trigger Print
    window.print();
}
