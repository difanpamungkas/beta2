// ==UserScript==
// @name         Beta 1.8.4 UserScript + Toggle Grade Filter v5.0.4
// @namespace    http://tampermonkey.net/
// @version      5.0.4
// @match        https://tsiraw.tsindustri.com/*
// @grant        GM_xmlhttpRequest
// @connect      tsiraw.tsindustri.com
// ==/UserScript==

(function() {
    'use strict';

    // Optimasi GPU: Hapus animasi pulseGlow agar GPU iPhone hemat daya
    const customStyle = document.createElement('style');
    customStyle.innerHTML = `
        .modern-btn {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .modern-btn:active {
            transform: scale(0.92) !important;
        }
        details summary::-webkit-details-marker { display: none; }
    `;
    document.head.appendChild(customStyle);

    var wakeLock = null;

    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {}
    }

    function releaseWakeLock() {
        if (wakeLock !== null) {
            wakeLock.release().then(function() { wakeLock = null; });
        }
    }

    // Fungsi khusus pembacaan Kode Bin dari server TSI
    function extractBinCode(item) {
        if (!item) return '-';
        var val = item.CODE_BIN || item.CODEBIN || item['Code Bin'] || item.code_bin || item['CODE BIN'] ||
                  item.BIN || item.BIN_LOC || item.BINLOC || item.RAK || item.BIN_CODE ||
                  item.STORAGE_BIN || item.LGPLA || item.LOCATION || item.bin || item.bin_code || '';
        val = val.toString().trim();
        return (val && val !== 'nan' && val !== 'null' && val !== 'undefined') ? val : '-';
    }

    function updateBadgeCount() {
        var saved = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
        var count = saved.length;

        var fBtn = document.getElementById('ds-floating-btn');
        if (fBtn) {
            var badgeEl = fBtn.querySelector('.ds-badge');
            if (!badgeEl) {
                badgeEl = document.createElement('span');
                badgeEl.className = 'ds-badge';
                badgeEl.style.cssText = `
                    position: absolute; top: -3px; right: -3px;
                    background: #ef4444; color: #ffffff;
                    font-size: 10px; font-weight: 800; padding: 2px 6px;
                    border-radius: 10px; border: 2px solid #0f172a;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.5); pointer-events: none;
                `;
                fBtn.style.position = 'fixed';
                fBtn.appendChild(badgeEl);
            }
            badgeEl.innerText = count;
            badgeEl.style.display = count > 0 ? 'block' : 'none';
        }

        var miniBadge = document.getElementById('ds-mini-badge');
        if (miniBadge) {
            var miniBadgeEl = miniBadge.querySelector('.ds-badge');
            if (!miniBadgeEl) {
                miniBadgeEl = document.createElement('span');
                miniBadgeEl.className = 'ds-badge';
                miniBadgeEl.style.cssText = `
                    position: absolute; top: -3px; right: -3px;
                    background: #ef4444; color: #ffffff;
                    font-size: 10px; font-weight: 800; padding: 2px 6px;
                    border-radius: 10px; border: 2px solid #0f172a;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.5); pointer-events: none;
                `;
                miniBadge.style.position = 'relative';
                miniBadge.appendChild(miniBadgeEl);
            }
            miniBadgeEl.innerText = count;
            miniBadgeEl.style.display = count > 0 ? 'block' : 'none';
        }
    }

    function initScript() {
        var existingBtns = document.querySelectorAll('#ds-floating-btn');
        if (existingBtns.length > 0) {
            if (existingBtns.length > 1) {
                existingBtns.forEach(function(el, idx) { if (idx > 0) el.remove(); });
            }
            updateBadgeCount();
            return;
        }

        var fBtn = document.createElement('button');
        fBtn.id = 'ds-floating-btn';
        fBtn.className = 'modern-btn';
        fBtn.innerText = '💀';
        fBtn.title = 'Buka Menu Scanner';
        fBtn.style.cssText = `
            position: fixed; top: 12px; right: 12px; z-index: 999999;
            width: 48px; height: 48px; border-radius: 50%;
            background: linear-gradient(135deg, #059669, #10b981);
            color: #ffffff; border: 2px solid rgba(255, 255, 255, 0.8);
            font-size: 22px; display: flex; align-items: center; justify-content: center;
            cursor: pointer; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4);
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            user-select: none;
        `;
        document.body.appendChild(fBtn);

        fBtn.onclick = function() {
            var panel = document.getElementById('ds-marathon-panel');
            if (panel) { panel.remove(); } else { createControlPanel(); }
        };

        updateBadgeCount();
    }

    function createControlPanel() {
        if (document.getElementById('ds-marathon-panel')) return;

        var lastKeyword = '';
        var lastStockItems = null;
        var lastLengthFilter = null;
        var activeGrade = 'ALL';

        var p = document.createElement('div');
        p.id = 'ds-marathon-panel';
        p.style.cssText = `
            position: fixed; top: 68px; right: 12px; z-index: 999999;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 7px;
            width: 290px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            font-family: system-ui, -apple-system, sans-serif; transition: all 0.25s ease;
        `;
        document.body.appendChild(p);

        var miniBadge = document.createElement('div');
        miniBadge.id = 'ds-mini-badge';
        miniBadge.style.cssText = `
            display: none; width: 48px; height: 48px; border-radius: 50%;
            background: linear-gradient(135deg, #059669, #10b981);
            color: #fff; font-size: 22px; align-items: center; justify-content: center;
            cursor: pointer; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.8); font-weight: bold; user-select: none;
        `;
        miniBadge.innerText = '💀';
        p.appendChild(miniBadge);

        var panelContent = document.createElement('div');
        panelContent.style.cssText = 'display: flex; flex-direction: column; gap: 7px;';
        p.appendChild(panelContent);

        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
        panelContent.appendChild(header);

        var title = document.createElement('div');
        title.innerHTML = '💀 <span style="background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">Beta 1.8 Glass</span>';
        title.style.cssText = 'font-size: 13px;';
        header.appendChild(title);

        var btnMin = document.createElement('button');
        btnMin.className = 'modern-btn';
        btnMin.innerText = '─';
        btnMin.title = 'Mode Ringkas Melayang';
        btnMin.style.cssText = 'background: rgba(255, 255, 255, 0.08); color: #94a3b8; border: none; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: bold; cursor: pointer;';
        header.appendChild(btnMin);

        function toggleMinimize(min) {
            if (min) {
                panelContent.style.display = 'none';
                p.style.background = 'transparent';
                p.style.border = 'none';
                p.style.padding = '0';
                p.style.width = 'auto';
                p.style.boxShadow = 'none';
                miniBadge.style.display = 'flex';
            } else {
                panelContent.style.display = 'flex';
                p.style.background = 'rgba(15, 23, 42, 0.95)';
                p.style.border = '1px solid rgba(255, 255, 255, 0.12)';
                p.style.padding = '12px';
                p.style.width = '290px';
                p.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5)';
                miniBadge.style.display = 'none';
            }
            updateBadgeCount();
        }

        btnMin.onclick = function() { toggleMinimize(true); };
        miniBadge.onclick = function() { toggleMinimize(false); };

        var searchCard = document.createElement('div');
        searchCard.style.cssText = 'display: flex; flex-direction: column; gap: 5px; padding: 7px; background: rgba(2, 6, 23, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px;';

        var searchHeader = document.createElement('div');
        searchHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; color: #38bdf8;';
        searchHeader.innerHTML = '<span>🔍 CEK FLEKSIBEL & REKAP STOK</span><span style="font-size: 9px; color: #4ade80;">v5.0.4</span>';
        searchCard.appendChild(searchHeader);

        var searchRow = document.createElement('div');
        searchRow.style.cssText = 'display: flex; gap: 5px; align-items: center;';
        searchCard.appendChild(searchRow);

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Ketik: 250 REG GFGD B04...';
        searchInput.style.cssText = 'flex: 1; padding: 6px 8px; background: rgba(15, 23, 42, 0.9); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; font-size: 11px; outline: none; text-transform: uppercase;';
        searchRow.appendChild(searchInput);

        var btnQuickScan = document.createElement('button');
        btnQuickScan.className = 'modern-btn';
        btnQuickScan.innerHTML = '📷';
        btnQuickScan.title = 'Scan Barcode Roll dengan Kamera';
        btnQuickScan.style.cssText = 'padding: 5px 8px; background: linear-gradient(135deg, #059669, #10b981); color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;';
        searchRow.appendChild(btnQuickScan);

        var btnSearchServer = document.createElement('button');
        btnSearchServer.className = 'modern-btn';
        btnSearchServer.innerText = 'Cek';
        btnSearchServer.style.cssText = 'padding: 6px 10px; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff; border: none; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer;';
        searchRow.appendChild(btnSearchServer);

        var thresholdRow = document.createElement('div');
        thresholdRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #cbd5e1; padding: 2px 2px;';
        thresholdRow.innerHTML = '<span>⚠️ Batas Roll Kurang (Meter):</span>';
        
        var thresholdInput = document.createElement('input');
        thresholdInput.id = 'ds-short-threshold';
        thresholdInput.type = 'number';
        thresholdInput.value = '100';
        thresholdInput.style.cssText = 'width: 55px; padding: 2px 4px; background: rgba(15, 23, 42, 0.9); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.4); border-radius: 4px; font-size: 10px; font-weight: bold; text-align: center; outline: none;';
        thresholdRow.appendChild(thresholdInput);
        searchCard.appendChild(thresholdRow);

        // --- TOGGLE FILTER GRADE (A / B / C / SEMUA) ---
        var gradeRow = document.createElement('div');
        gradeRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #cbd5e1; padding: 2px 2px; border-top: 1px dashed rgba(255,255,255,0.1); margin-top: 2px; pt: 2px;';
        gradeRow.innerHTML = '<span>🏷️ Filter Grade:</span>';

        var gradeBtnContainer = document.createElement('div');
        gradeBtnContainer.style.cssText = 'display: flex; gap: 3px;';

        var gradeBtns = {};
        ['ALL', 'A', 'B', 'C'].forEach(function(g) {
            var btn = document.createElement('button');
            btn.className = 'modern-btn';
            btn.innerText = g === 'ALL' ? 'Semua' : 'Grd ' + g;
            btn.style.cssText = 'padding: 2px 6px; font-size: 8.5px; font-weight: bold; border-radius: 4px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); ' +
                (g === 'ALL' ? 'background: #0284c7; color: #fff;' : 'background: rgba(255,255,255,0.05); color: #cbd5e1;');
            btn.onclick = function() {
                activeGrade = g;
                Object.keys(gradeBtns).forEach(function(k) {
                    if (k === g) {
                        gradeBtns[k].style.background = '#0284c7';
                        gradeBtns[k].style.color = '#fff';
                    } else {
                        gradeBtns[k].style.background = 'rgba(255,255,255,0.05)';
                        gradeBtns[k].style.color = '#cbd5e1';
                    }
                });
                if (lastStockItems) {
                    renderCustomerSummary(lastKeyword, lastStockItems, lastLengthFilter);
                }
            };
            gradeBtns[g] = btn;
            gradeBtnContainer.appendChild(btn);
        });
        gradeRow.appendChild(gradeBtnContainer);
        searchCard.appendChild(gradeRow);

        var searchResultDiv = document.createElement('div');
        searchResultDiv.style.cssText = 'display: none; font-size: 10px; border-radius: 6px; padding: 6px; max-height: 280px; overflow-y: auto;';
        searchCard.appendChild(searchResultDiv);

        panelContent.appendChild(searchCard);

        function delay(ms) {
            return new Promise(function(resolve) { setTimeout(resolve, ms); });
        }

        function fetchSingleStock(rollCode) {
            return new Promise(function(resolve) {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://tsiraw.tsindustri.com/rstock/get_stock",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Accept": "application/json, text/javascript, */*; q=0.01"
                    },
                    data: "mat=&sloc=&batch=" + encodeURIComponent(rollCode) + "&cust=&refr=&shift=",
                    timeout: 8000,
                    onload: function(res) {
                        try { resolve({ code: rollCode, data: JSON.parse(res.responseText) }); }
                        catch(e) { resolve({ code: rollCode, data: [] }); }
                    },
                    onerror: function() { resolve({ code: rollCode, data: [] }); }
                });
            });
        }

        function fetchAllStockData() {
            return new Promise(function(resolve) {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://tsiraw.tsindustri.com/rstock/get_stock",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Accept": "application/json, text/javascript, */*; q=0.01"
                    },
                    data: "mat=&sloc=&batch=&cust=&refr=&shift=",
                    timeout: 10000,
                    onload: function(res) {
                        try { resolve(JSON.parse(res.responseText)); } catch(e) { resolve([]); }
                    },
                    onerror: function() { resolve([]); }
                });
            });
        }

        function fetchSingleTx(rollCode) {
            return new Promise(function(resolve) {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://tsiraw.tsindustri.com/ttranslist/get_stock",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Accept": "application/json, text/javascript, */*; q=0.01"
                    },
                    data: "id=&mat=&sloc=&batch=" + encodeURIComponent(rollCode) + "&date1=&date2=",
                    timeout: 8000,
                    onload: function(res) {
                        try { resolve(JSON.parse(res.responseText)); } catch(e) { resolve([]); }
                    },
                    onerror: function() { resolve([]); }
                });
            });
        }

        async function doServerCheck(queryInput) {
            var rawInput = (queryInput || searchInput.value).trim().toUpperCase();
            if (!rawInput) {
                searchResultDiv.style.display = 'block';
                searchResultDiv.style.background = 'rgba(245, 158, 11, 0.15)';
                searchResultDiv.style.border = '1px solid rgba(245, 158, 11, 0.3)';
                searchResultDiv.style.color = '#fbbf24';
                searchResultDiv.innerText = '⚠️ Masukkan nomor roll, kata kunci kain, atau lokasi gudang/bin terlebih dahulu.';
                return;
            }

            var lengthFilter = null;
            var lengthMatch = rawInput.match(/<\s*(\d+(\.\d+)?)\s*M?/i);
            if (lengthMatch) {
                lengthFilter = parseFloat(lengthMatch[1]);
                rawInput = rawInput.replace(/<\s*(\d+(\.\d+)?)\s*M?/i, '').trim();
                var thresholdEl = document.getElementById('ds-short-threshold');
                if (thresholdEl) thresholdEl.value = lengthFilter;
            }

            btnSearchServer.disabled = true;
            btnSearchServer.innerText = '⏳';
            searchResultDiv.style.display = 'block';
            searchResultDiv.style.background = 'rgba(255, 255, 255, 0.05)';
            searchResultDiv.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            searchResultDiv.style.color = '#94a3b8';

            var tokens = rawInput.split(/[\s,\n]+/).filter(Boolean);

            if (tokens.length > 1 && tokens.every(function(t) { return t.length >= 6 && /^[A-Z0-9]+$/.test(t); })) {
                searchResultDiv.innerText = '🛡️ Mengantre ' + tokens.length + ' roll (Jeda Aman IT)...';
                var multiStockResults = [];

                for (var idx = 0; idx < tokens.length; idx++) {
                    var code = tokens[idx];
                    searchResultDiv.innerText = '⏳ Mengecek (' + (idx + 1) + '/' + tokens.length + '): ' + code;
                    var res = await fetchSingleStock(code);
                    if (res && res.data && res.data.length > 0) {
                        multiStockResults.push(res.data[0]);
                    }
                    await delay(350);
                }

                btnSearchServer.disabled = false;
                btnSearchServer.innerText = 'Cek';
                lastKeyword = rawInput;
                lastStockItems = multiStockResults;
                lastLengthFilter = lengthFilter;
                renderCustomerSummary(rawInput, multiStockResults, lengthFilter);

            } else if (rawInput.length >= 8 && /^[A-Z0-9]+$/.test(rawInput) && !rawInput.includes('-') && !rawInput.includes(' ') && !rawInput.includes('TEX') && !rawInput.includes('REG')) {
                searchResultDiv.innerText = '🔄 Mengambil data roll ' + rawInput + '...';
                Promise.all([fetchSingleStock(rawInput), fetchSingleTx(rawInput)]).then(function(results) {
                    btnSearchServer.disabled = false;
                    btnSearchServer.innerText = 'Cek';
                    var stockData = Array.isArray(results[0].data) ? results[0].data : [];
                    var txData = Array.isArray(results[1]) ? results[1] : [];
                    renderDetailedResult(rawInput, stockData, txData);
                });

            } else {
                searchResultDiv.innerText = '🔎 Menarik stok server & mencari "' + rawInput + '"' + (lengthFilter !== null ? ' (<' + lengthFilter + 'm)' : '') + '...';
                var allStockData = await fetchAllStockData();
                btnSearchServer.disabled = false;
                btnSearchServer.innerText = 'Cek';

                var queryWords = rawInput.split(/\s+/).filter(Boolean);

                var filtered = allStockData.filter(function(item) {
                    var name = (item.NAME || item.DESC || item.MATERIAL || '').toUpperCase();
                    var batch = (item.BATCH || '').toUpperCase();
                    var cust = (item.CUST || item.CUSTOMER || '').toUpperCase();
                    var mat = (item.MATERIAL || '').toUpperCase();
                    var sloc = (item.SLOC || '').toUpperCase();
                    var bin = extractBinCode(item).toUpperCase();
                    var fullText = (name + " " + batch + " " + cust + " " + mat + " " + sloc + " " + bin).toUpperCase();
                    var itemLen = parseFloat(item.LENGTH || item.LENGTH_M || 0) || 0;

                    var wordMatch = queryWords.length === 0 || queryWords.every(function(word) {
                        return fullText.indexOf(word) !== -1;
                    });

                    if (lengthFilter !== null) {
                        return wordMatch && itemLen < lengthFilter;
                    }
                    return wordMatch;
                });

                lastKeyword = rawInput;
                lastStockItems = filtered;
                lastLengthFilter = lengthFilter;
                renderCustomerSummary(rawInput, filtered, lengthFilter);
            }
        }

        // --- RINGKASAN PER-CUSTOMER (DENGAN DYNAMIC GRADE FILTER v5.0.4) ---
        function renderCustomerSummary(keyword, items, activeLengthFilter) {
            if (!items || items.length === 0) {
                searchResultDiv.style.background = 'rgba(239, 68, 68, 0.15)';
                searchResultDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                searchResultDiv.style.color = '#f87171';
                var filterTag = activeLengthFilter !== null ? ' (<' + activeLengthFilter + 'm)' : '';
                searchResultDiv.innerHTML = '<b>🔴 KAIN / ROLL TIDAK DITEMUKAN</b><br><span style="font-size:9px; color:#cbd5e1;">Tidak ada stok aktif untuk kata kunci: <b>' + keyword + filterTag + '</b></span>';
                return;
            }

            var displayItems = items.filter(function(item) {
                if (activeGrade === 'ALL') return true;
                var g = (item.GRADE || '-').toString().trim().toUpperCase();
                return g === activeGrade;
            });

            if (displayItems.length === 0) {
                searchResultDiv.style.background = 'rgba(245, 158, 11, 0.15)';
                searchResultDiv.style.border = '1px solid rgba(245, 158, 11, 0.3)';
                searchResultDiv.style.color = '#fbbf24';
                searchResultDiv.innerHTML = '<b>⚠️ STOK GRADE ' + activeGrade + ' KOSONG</b><br><span style="font-size:9px; color:#cbd5e1;">Tidak ada roll dengan Grade ' + activeGrade + ' untuk kata kunci: <b>' + keyword + '</b></span>';
                return;
            }

            var thresholdEl = document.getElementById('ds-short-threshold');
            var customLimit = thresholdEl ? (parseFloat(thresholdEl.value) || 100) : 100;

            var totalRolls = displayItems.length;
            var totalMeters = 0;
            var totalWeight = 0;
            var customerMap = {};
            var foundBatches = [];

            displayItems.forEach(function(item) {
                var custName = (item.CUST || item.CUSTOMER || 'TIDAK ADA CUST / BEBAS').toString().trim().toUpperCase();
                if (!custName || custName === 'NAN' || custName === 'NULL') custName = 'STOK BEBAS / TANPA CUST';

                var len = parseFloat(item.LENGTH || item.LENGTH_M || 0) || 0;
                var wgt = parseFloat(item.WEIGHT || item.WEIGHTN || 0) || 0;
                var batchCode = (item.BATCH || '').trim();
                var sloc = (item.SLOC || 'N/A').trim();
                var bin = extractBinCode(item);
                var grade = (item.GRADE || '-').trim();
                var width = (item.WIDTH || item.WIDTH_M || '-').toString().trim();
                var remark = (item.REMARK || item.REMARK_ || '').toString().trim();

                totalMeters += len;
                totalWeight += wgt;

                if (batchCode && foundBatches.indexOf(batchCode) === -1) {
                    foundBatches.push(batchCode);
                }

                if (!customerMap[custName]) {
                    customerMap[custName] = { count: 0, meters: 0, weight: 0, rolls: [] };
                }
                customerMap[custName].count += 1;
                customerMap[custName].meters += len;
                customerMap[custName].weight += wgt;
                customerMap[custName].rolls.push({
                    batch: batchCode,
                    length: len,
                    weight: wgt,
                    sloc: sloc,
                    bin: bin,
                    grade: grade,
                    width: width,
                    remark: remark
                });
            });

            searchResultDiv.style.background = 'rgba(34, 197, 94, 0.12)';
            searchResultDiv.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            searchResultDiv.style.color = '#f8fafc';

            var titleTag = activeLengthFilter !== null ? ' <span style="color:#facc15;">(<' + activeLengthFilter + 'm)</span>' : '';
            var gradeTag = activeGrade !== 'ALL' ? ' <span style="color:#38bdf8;">[Grd ' + activeGrade + ']</span>' : '';
            var html = '<div style="font-weight:bold; font-size:11px; color:#4ade80; margin-bottom:4px;">📦 REKAP STOK: ' + keyword + titleTag + gradeTag + '</div>' +
                '<div style="background:rgba(0,0,0,0.35); padding:6px; border-radius:6px; margin-bottom:6px; line-height:1.4;">' +
                '• <b>Total Stok:</b> <b style="color:#38bdf8;">' + totalRolls + ' Roll</b><br>' +
                '• <b>Total Panjang:</b> <b style="color:#facc15;">' + totalMeters.toFixed(1) + ' Meter</b><br>' +
                '• <b>Total Berat:</b> <b style="color:#4ade80;">' + totalWeight.toFixed(1) + ' KG</b>' +
                '</div>';

            html += '<div style="font-size:10px; font-weight:700; color:#38bdf8; margin-bottom:3px;">🏢 RINGKASAN PER CUSTOMER:</div>';
            html += '<div style="background:rgba(0,0,0,0.25); padding:5px; border-radius:6px; max-height:160px; overflow-y:auto; margin-bottom:6px;">';

            Object.keys(customerMap).forEach(function(cust, idx) {
                var cData = customerMap[cust];

                html += '<details style="border-bottom:1px solid rgba(255,255,255,0.08); padding:3px 0; font-size:9.5px; line-height:1.3;">' +
                    '<summary style="cursor:pointer; outline:none; user-select:none;">' +
                    '▶ <b style="color:#e0e7ff;">' + cust + '</b><br>' +
                    '&nbsp;&nbsp;➔ <b style="color:#38bdf8;">' + cData.count + ' Roll</b> | ' + cData.meters.toFixed(1) + 'm | ' + cData.weight.toFixed(1) + ' KG' +
                    '</summary>' +
                    '<div style="background:rgba(15, 23, 42, 0.85); padding:5px; border-radius:5px; margin-top:4px; margin-bottom:4px;">' +
                    '<div style="font-weight:bold; color:#facc15; margin-bottom:3px; font-size:9px;">📋 LIST ROLL ' + cust + ':</div>';

                var custBatches = [];
                cData.rolls.forEach(function(r) {
                    if (r.batch) custBatches.push(r.batch);

                    var isShort = r.length > 0 && r.length < customLimit;
                    var shortBadge = isShort ? ' <span style="background:#f59e0b; color:#000; padding:0 3px; border-radius:3px; font-weight:800; font-size:8px;">⚠️ <' + customLimit + 'm</span>' : '';
                    
                    var wgtStr = r.weight > 0 ? r.weight + 'kg' : '0kg';
                    var widthStr = (r.width && r.width !== '-') ? ' | ' + r.width + 'm' : '';
                    var binStr = ' | Bin: <b style="color:#f472b6;">' + r.bin + '</b>';
                    var remarkStr = (r.remark && r.remark !== 'nan' && r.remark !== 'null') ? ' | <span style="color:#fca5a5;">⚠️ ' + r.remark + '</span>' : '';

                    html += '<div style="font-size:8.5px; border-bottom:1px dashed rgba(255,255,255,0.08); padding:3px 0; color:#cbd5e1; display:flex; justify-content:space-between; align-items:center;">' +
                        '<span style="padding-right:4px;">• <b style="color:#38bdf8;">' + r.batch + '</b>' + shortBadge + ' | ' + r.length + 'm | ' + wgtStr + widthStr + ' | Sloc: <b style="color:#4ade80;">' + r.sloc + '</b>' + binStr + ' | Grd: <b style="color:#facc15;">' + r.grade + '</b>' + remarkStr + '</span>' +
                        '<button class="btn-copy-single-roll" data-roll="' + r.batch + '" style="padding:1px 5px; background:rgba(56, 189, 248, 0.2); color:#38bdf8; border:1px solid rgba(56, 189, 248, 0.4); border-radius:3px; font-size:8px; font-weight:bold; cursor:pointer; flex-shrink:0;">📋 Salin</button>' +
                        '</div>';
                });

                html += '<div style="display:flex; gap:4px; margin-top:5px;">' +
                    '<button class="btn-copy-cust-list" data-text="' + custBatches.join('\n') + '" style="flex:1; padding:3px; background:#0284c7; color:#fff; border:none; border-radius:4px; font-size:8.5px; font-weight:bold; cursor:pointer;">📋 Salin Daftar Roll</button>' +
                    '<button class="btn-save-single-cust" data-batches=\'' + JSON.stringify(custBatches) + '\' style="flex:1; padding:3px; background:#10b981; color:#fff; border:none; border-radius:4px; font-size:8.5px; font-weight:bold; cursor:pointer;">+ Simpan ke Memori</button>' +
                    '</div>';
                html += '</div></details>';
            });

            html += '</div>';

            if (foundBatches.length > 0) {
                html += '<button id="btn-save-cust-batches" style="width:100%; padding:5px; background:#10b981; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:10px;">+ Simpan Semua ' + foundBatches.length + ' Roll (Semua Customer)</button>';
            }

            searchResultDiv.innerHTML = html;

            var copyRollBtns = searchResultDiv.querySelectorAll('.btn-copy-single-roll');
            copyRollBtns.forEach(function(btn) {
                btn.onclick = function(e) {
                    e.stopPropagation();
                    var rollCode = btn.getAttribute('data-roll');
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(rollCode).then(function() {
                            playBeep();
                            st.innerText = '📋 Tersalin: ' + rollCode;
                            st.style.color = '#38bdf8';
                        });
                    } else { prompt('Salin nomor roll:', rollCode); }
                };
            });

            var copyCustBtns = searchResultDiv.querySelectorAll('.btn-copy-cust-list');
            copyCustBtns.forEach(function(btn) {
                btn.onclick = function(e) {
                    e.stopPropagation();
                    var listText = btn.getAttribute('data-text');
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(listText).then(function() {
                            playBeep();
                            st.innerText = '📋 Daftar roll customer tersalin!';
                            st.style.color = '#38bdf8';
                        });
                    } else { prompt('Salin daftar roll:', listText); }
                };
            });

            var btnSaveCust = document.getElementById('btn-save-cust-batches');
            if (btnSaveCust) {
                btnSaveCust.onclick = function() {
                    var saved = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
                    var addedCount = 0;
                    foundBatches.forEach(function(b) {
                        if (saved.indexOf(b) === -1) {
                            saved.push(b);
                            addedCount++;
                        }
                    });
                    localStorage.setItem('tsiraw_saved_batches', JSON.stringify(saved));
                    updateBadgeCount();
                    playBeep();
                    st.innerText = '✔ Berhasil menambah ' + addedCount + ' roll ke memori!';
                    st.style.color = '#4ade80';
                };
            }

            var singleCustBtns = searchResultDiv.querySelectorAll('.btn-save-single-cust');
            singleCustBtns.forEach(function(btn) {
                btn.onclick = function(e) {
                    e.stopPropagation();
                    var bList = JSON.parse(btn.getAttribute('data-batches') || '[]');
                    var saved = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
                    var addedCount = 0;
                    bList.forEach(function(b) {
                        if (saved.indexOf(b) === -1) {
                            saved.push(b);
                            addedCount++;
                        }
                    });
                    localStorage.setItem('tsiraw_saved_batches', JSON.stringify(saved));
                    updateBadgeCount();
                    playBeep();
                    st.innerText = '✔ Berhasil menambah ' + addedCount + ' roll khusus ke memori!';
                    st.style.color = '#4ade80';
                };
            });
        }

        function renderDetailedResult(rollCode, stockData, txData) {
            var itemStock = stockData.length > 0 ? stockData[0] : null;
            var itemTx = txData.length > 0 ? txData[txData.length - 1] : null;

            searchResultDiv.style.background = itemStock ? 'rgba(34, 197, 94, 0.15)' : (itemTx ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)');
            searchResultDiv.style.border = itemStock ? '1px solid rgba(34, 197, 94, 0.3)' : (itemTx ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)');
            searchResultDiv.style.color = itemStock ? '#4ade80' : (itemTx ? '#fbbf24' : '#f87171');

            var statusHeader = itemStock ? '🟢 ' + rollCode + ' (Ada di Stok)' : (itemTx ? '🟠 ' + rollCode + ' (Sudah Keluar / OUT)' : '🔴 ' + rollCode + ' (Tidak Ditemukan)');
            var html = '<div style="font-weight:bold; font-size:11px; margin-bottom:4px;">' + statusHeader + '</div>';

            if (itemStock) {
                var sloc = itemStock.SLOC || 'N/A';
                var bin = extractBinCode(itemStock);
                var name = itemStock.NAME || itemStock.DESC || '-';
                var cust = itemStock.CUST || itemStock.CUSTOMER || '-';
                var grade = itemStock.GRADE || '-';
                var length = itemStock.LENGTH || itemStock.LENGTH_M || '-';
                var width = itemStock.WIDTH || itemStock.WIDTH_M || '-';
                var weight = itemStock.WEIGHT || itemStock.WEIGHTN || '-';
                var gsm = itemStock.GSM || '-';
                var material = itemStock.MATERIAL || '-';
                var remark = (itemStock.REMARK || itemStock.REMARK_ || (itemTx ? itemTx.REMARK : '') || '').toString().trim();

                html += '<div style="background:rgba(0,0,0,0.3); padding:6px; border-radius:6px; margin-bottom:6px; line-height:1.4;">' +
                    '<b>📦 DETAIL STOK GUDANG:</b><br>' +
                    '• Lokasi (Sloc): <b style="color:#38bdf8;">' + sloc + '</b> | Bin: <b style="color:#f472b6;">' + bin + '</b><br>' +
                    '• Nama Barang: <span style="color:#f1f5f9;">' + name + '</span><br>' +
                    '• Customer: <b style="color:#e0e7ff;">' + cust + '</b><br>' +
                    '• Material: <span style="color:#cbd5e1;">' + material + '</span><br>' +
                    '• Grade: <b style="color:#facc15;">' + grade + '</b> | GSM: <b>' + gsm + '</b><br>' +
                    '• Dimensi: <b>' + (width !== '-' ? width + 'm x ' : '') + length + ' m</b><br>' +
                    '• Berat: <b style="color:#4ade80;">' + weight + ' KG</b>';

                if (remark && remark !== 'nan' && remark !== 'null') {
                    html += '<div style="margin-top:4px; padding:4px 6px; background:rgba(239, 68, 68, 0.2); border:1px solid rgba(239, 68, 68, 0.4); border-radius:5px; color:#fca5a5;">' +
                        '⚠️ <b>Catatan/Defect:</b> ' + remark + '</div>';
                } else {
                    html += '<div style="margin-top:3px; color:#94a3b8; font-size:9px;">• Catatan/Defect: Tidak ada</div>';
                }
                html += '</div>';

            } else if (itemTx) {
                var nameTx = itemTx.NAME || itemTx.DESC || '-';
                var custTx = itemTx.CUST || itemTx.CUSTOMER || '-';
                var matTx = itemTx.MATERIAL || itemTx.MAT || '-';
                var gradeTx = itemTx.GRADE || '-';
                var lenTx = itemTx.LENGTH || itemTx.LENGTH_M || '-';
                var wgtTx = itemTx.WEIGHT || itemTx.WEIGHTN || '-';
                var remTx = (itemTx.REMARK || '').toString().trim();

                html += '<div style="background:rgba(0,0,0,0.3); padding:6px; border-radius:6px; margin-bottom:6px; line-height:1.4;">' +
                    '<b>📤 DETAIL BARANG KELUAR:</b><br>' +
                    '• Nama Barang: <span style="color:#f1f5f9;">' + nameTx + '</span><br>' +
                    '• Customer: <b style="color:#e0e7ff;">' + custTx + '</b><br>' +
                    '• Material: <span style="color:#cbd5e1;">' + matTx + '</span><br>' +
                    '• Grade: <b style="color:#facc15;">' + gradeTx + '</b> | Meter: <b>' + lenTx + ' m</b><br>' +
                    '• Berat: <b style="color:#fbbf24;">' + wgtTx + ' KG</b>';

                if (remTx && remTx !== 'nan' && remTx !== 'null') {
                    html += '<div style="margin-top:4px; padding:4px 6px; background:rgba(239, 68, 68, 0.2); border:1px solid rgba(239, 68, 68, 0.4); border-radius:5px; color:#fca5a5;">' +
                        '⚠️ <b>Catatan/Defect:</b> ' + remTx + '</div>';
                } else {
                    html += '<div style="margin-top:3px; color:#94a3b8; font-size:9px;">• Catatan/Defect: Tidak ada</div>';
                }
                html += '</div>';

            } else {
                html += '<div style="margin-bottom:6px;">⚠️ Nomor roll tidak ditemukan di server (Stok maupun Transaksi).</div>';
            }

            if (txData.length > 0) {
                html += '<div style="background:rgba(0,0,0,0.3); padding:6px; border-radius:6px; margin-bottom:6px; line-height:1.3;">' +
                    '<b>📜 RIWAYAT TRANSAKSI (' + txData.length + '):</b>';
                
                txData.slice().reverse().slice(0, 3).forEach(function(tx) {
                    var tipe = tx.QTYN && parseFloat(tx.QTYN) < 0 ? '📤 OUT' : '📥 IN';
                    var idTrans = tx.ID_TRANS || '-';
                    var sloc = tx.SLOC || '-';
                    var user = tx.USER_CREATE || '-';
                    var dateStr = tx.CDATE ? tx.CDATE : (tx.DATE ? tx.DATE : '');

                    html += '<div style="font-size:9px; border-bottom:1px solid rgba(255,255,255,0.08); padding:3px 0;">' +
                        '• <b>' + dateStr + '</b><br>&nbsp;&nbsp;Status: ' + tipe + ' di <b>' + sloc + '</b><br>&nbsp;&nbsp;ID: ' + idTrans + ' (Oleh: ' + user + ')' +
                        '</div>';
                });

                html += '</div>';
            } else {
                html += '<div style="font-size:9px; color:#94a3b8; margin-bottom:6px;">• Tidak ada transaksi tercatat.</div>';
            }

            if (itemStock) {
                html += '<button id="btn-add-search-buf" style="width:100%; padding:5px; background:#10b981; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:10px;">+ Simpan ke Memori (Auto Input)</button>';
            }

            searchResultDiv.innerHTML = html;

            var btnAddBuf = document.getElementById('btn-add-search-buf');
            if (btnAddBuf) {
                btnAddBuf.onclick = function() {
                    var saved = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
                    if (saved.indexOf(rollCode) === -1) {
                        saved.push(rollCode);
                        localStorage.setItem('tsiraw_saved_batches', JSON.stringify(saved));
                        updateBadgeCount();
                        playBeep();
                        st.innerText = '✔ ' + rollCode + ' disimpan ke memori!';
                        st.style.color = '#4ade80';
                    } else {
                        alert('Kode ' + rollCode + ' sudah ada di memori!');
                    }
                };
            }
        }

        btnSearchServer.onclick = function() { doServerCheck(); };
        searchInput.onkeypress = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                doServerCheck();
            }
        };

        var btnScan = document.createElement('button');
        btnScan.className = 'modern-btn';
        btnScan.innerText = '📷 BUKA SCANNER KAMERA';
        btnScan.style.cssText = 'padding: 9px; background: linear-gradient(135deg, #059669, #10b981); color: #fff; border: none; border-radius: 9px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);';
        panelContent.appendChild(btnScan);

        var btnSweepScan = document.createElement('button');
        btnSweepScan.className = 'modern-btn';
        btnSweepScan.innerText = '⚡ SAPU LEMBARAN KAMERA';
        btnSweepScan.style.cssText = 'padding: 9px; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff; border: none; border-radius: 9px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);';
        panelContent.appendChild(btnSweepScan);

        var btnGalleryScan = document.createElement('button');
        btnGalleryScan.className = 'modern-btn';
        btnGalleryScan.innerText = '🖼 SCAN DARI GALERI HP';
        btnGalleryScan.style.cssText = 'padding: 9px; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: #fff; border: none; border-radius: 9px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);';
        panelContent.appendChild(btnGalleryScan);

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        panelContent.appendChild(fileInput);

        btnGalleryScan.onclick = function() {
            initAudio();
            if (!window.ZXing) { alert('Pustaka masih memuat.'); return; }
            fileInput.click();
        };

        fileInput.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(event) {
                var img = new Image();
                img.onload = function() {
                    try {
                        var codeReader = new window.ZXing.BrowserMultiFormatReader();
                        codeReader.decodeFromImageElement(img).then(function(result) {
                            if (result) {
                                var kode = result.text.trim();
                                var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
                                if (savedBatches.indexOf(kode) === -1) {
                                    savedBatches.push(kode);
                                    localStorage.setItem('tsiraw_saved_batches', JSON.stringify(savedBatches));
                                    playBeep();
                                    updateBadgeCount();
                                    st.innerText = '✔ Foto Terbaca: ' + kode;
                                    st.style.color = '#4ade80';
                                } else {
                                    st.innerText = '⚠ Barcode sudah ada di memori!';
                                }
                            }
                        }).catch(function() { alert('Gagal membaca barcode dari gambar.'); });
                    } catch(err) { alert('Error: ' + err.message); }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            fileInput.value = '';
        };

        var actionRow = document.createElement('div');
        actionRow.style.cssText = 'display: flex; gap: 6px;';
        panelContent.appendChild(actionRow);

        var btnExportSweep = document.createElement('button');
        btnExportSweep.className = 'modern-btn';
        btnExportSweep.innerText = '📋 SALIN DATA';
        btnExportSweep.style.cssText = 'flex: 1; padding: 7px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer;';
        actionRow.appendChild(btnExportSweep);

        var btnClearSweep = document.createElement('button');
        btnClearSweep.className = 'modern-btn';
        btnClearSweep.innerText = '🗑 HAPUS MEMORI';
        btnClearSweep.style.cssText = 'flex: 1; padding: 7px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer;';
        actionRow.appendChild(btnClearSweep);

        btnExportSweep.onclick = function() {
            var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
            if (savedBatches.length === 0) { alert('Memori kosong!'); return; }
            var textData = savedBatches.join('\n');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textData).then(function() {
                    alert('✔ Berhasil menyalin ' + savedBatches.length + ' batch!');
                }).catch(function() { prompt('Salin manual:', textData); });
            } else { prompt('Salin manual:', textData); }
        };

        btnClearSweep.onclick = function() {
            var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
            if (savedBatches.length === 0) { alert('Memori sudah kosong!'); return; }
            if (confirm('Hapus seluruh ' + savedBatches.length + ' batch tersimpan?')) {
                localStorage.setItem('tsiraw_saved_batches', '[]');
                st.innerText = '🗑 Memori dikosongkan!';
                updateBadgeCount();
            }
        };

        var soundOn = JSON.parse(localStorage.getItem('tsiraw_sound_on') !== null ? localStorage.getItem('tsiraw_sound_on') : 'true');
        var btnSound = document.createElement('button');
        btnSound.className = 'modern-btn';
        btnSound.innerText = soundOn ? '🔊 Suara Beep: ON' : '🔇 Suara Beep: OFF';
        btnSound.style.cssText = 'padding: 5px; background: ' + (soundOn ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.05)') + '; color: ' + (soundOn ? '#38bdf8' : '#64748b') + '; border: 1px solid ' + (soundOn ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.08)') + '; border-radius: 8px; font-weight: 600; font-size: 11px; cursor: pointer;';
        panelContent.appendChild(btnSound);

        var audioCtx = null;
        function initAudio() {
            if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            if (audioCtx.state === 'suspended') { audioCtx.resume(); }
        }

        btnSound.onclick = function() {
            soundOn = !soundOn;
            localStorage.setItem('tsiraw_sound_on', soundOn);
            btnSound.innerText = soundOn ? '🔊 Suara Beep: ON' : '🔇 Suara Beep: OFF';
            btnSound.style.background = soundOn ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.05)';
            btnSound.style.color = soundOn ? '#38bdf8' : '#64748b';
            if (soundOn) { initAudio(); playBeep(); }
        };

        function playBeep() {
            if (!soundOn) return;
            try {
                initAudio();
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.type = 'sine'; osc.frequency.value = 800;
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 0.15);
            } catch(e) {}
        }

        var filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Kategori (mis: Landscape / TSI)';
        filterInput.style.cssText = 'padding: 7px 10px; background: rgba(2, 6, 23, 0.6); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; font-size: 11px; outline: none;';
        panelContent.appendChild(filterInput);

        var btnFetch = document.createElement('button');
        btnFetch.className = 'modern-btn';
        btnFetch.innerText = '📋 Ambil Nomor Batch Saja';
        btnFetch.style.cssText = 'padding: 7px; background: rgba(255, 255, 255, 0.08); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; font-weight: 600; font-size: 11px; cursor: pointer;';
        panelContent.appendChild(btnFetch);

        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 6px; margin-top: 2px;';
        panelContent.appendChild(btnContainer);

        var btnOn = document.createElement('button');
        btnOn.className = 'modern-btn';
        btnOn.innerText = '🟢 ON (Auto)';
        btnOn.style.cssText = 'flex: 1; padding: 7px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);';
        btnContainer.appendChild(btnOn);

        var btnOff = document.createElement('button');
        btnOff.className = 'modern-btn';
        btnOff.innerText = '🔴 OFF (Stop)';
        btnOff.style.cssText = 'flex: 1; padding: 7px; background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; font-weight: 700; font-size: 11px; opacity: 0.6; cursor: pointer;';
        btnContainer.appendChild(btnOff);

        var st = document.createElement('div');
        var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
        st.innerText = savedBatches.length > 0 ? '💾 Tersimpan: ' + savedBatches.length + ' batch' : 'Status: Siap';
        st.style.cssText = 'padding: 5px 8px; background: rgba(2, 6, 23, 0.7); color: #38bdf8; text-align: center; border-radius: 8px; font-size: 10px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.05);';
        panelContent.appendChild(st);

        var closePanel = document.createElement('button');
        closePanel.className = 'modern-btn';
        closePanel.innerText = '✕ Tutup Panel';
        closePanel.style.cssText = 'padding: 3px; background: transparent; color: #64748b; border: none; font-size: 10px; cursor: pointer;';
        panelContent.appendChild(closePanel);

        closePanel.onclick = function() { p.remove(); };

        var isRunning = false;

        async function injectValue(kode) {
            var i = document.activeElement;
            if (!i || i.tagName !== 'INPUT') {
                i = document.querySelector('input[placeholder*="batch" i]') || document.querySelector('input[placeholder*="barcode" i]') || Array.from(document.querySelectorAll('input')).find(function(el) {
                    return el.type !== 'date' && el.type !== 'hidden';
                });
            }
            if (!i) return;

            i.focus();
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(i, kode);
            i.dispatchEvent(new Event('input', { bubbles: true }));
            i.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(function(r) { setTimeout(r, 300); });

            var container = i.closest('div');
            var b = (container ? container.querySelector('button, [role="button"]') : null) || document.querySelectorAll('button');
            if (b instanceof Element) {
                b.click();
            } else if (b && b.length) {
                b[b.length - 1].click();
            } else {
                ['keydown', 'keypress', 'keyup'].forEach(function(eName) {
                    i.dispatchEvent(new KeyboardEvent(eName, { key: 'Enter', keyCode: 13, bubbles: true }));
                });
            }
        }

        btnFetch.onclick = function() {
            initAudio();
            var keyword = filterInput.value.trim().toLowerCase();
            if (!keyword) { alert('Masukkan kata kunci kategori!'); return; }

            var rows = document.querySelectorAll('tr');
            var newBatches = [];

            rows.forEach(function(row) {
                if (row.innerText.toLowerCase().indexOf(keyword) !== -1) {
                    row.querySelectorAll('td, th').forEach(function(col) {
                        var val = col.innerText.trim();
                        if (/^[A-Z0-9]{8,15}$/.test(val) && !val.includes('TEX') && !val.includes('NAME') && !val.toLowerCase().includes(keyword)) {
                            if (newBatches.indexOf(val) === -1) { newBatches.push(val); }
                        }
                    });
                }
            });

            localStorage.setItem('tsiraw_saved_batches', JSON.stringify(newBatches));
            updateBadgeCount();
            st.innerText = '✔ Memuat ' + newBatches.length + ' batch';
            st.style.color = '#4ade80';
        };

        btnOff.onclick = function() {
            isRunning = false;
            releaseWakeLock();
            btnOn.style.opacity = '1';
            btnOff.style.opacity = '0.6';
            st.innerText = 'Status: Dihentikan (OFF)';
            updateBadgeCount();
        };

        btnOn.onclick = async function() {
            initAudio();
            var extractedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
            if (extractedBatches.length === 0) { alert('Memori kosong!'); return; }

            if (isRunning) return;
            isRunning = true;
            await requestWakeLock();

            btnOn.style.opacity = '0.6';
            btnOff.style.opacity = '1';
            miniBadge.style.background = 'linear-gradient(135deg, #0284c7, #38bdf8)';
            st.innerText = '⏳ Auto Input Berjalan...';

            while (extractedBatches.length > 0 && isRunning) {
                if (!isRunning) break;
                var kode = extractedBatches.shift();
                localStorage.setItem('tsiraw_saved_batches', JSON.stringify(extractedBatches));
                updateBadgeCount();
                await injectValue(kode);

                var btnOk = Array.from(document.querySelectorAll('button')).find(function(b) {
                    return b.innerText.toLowerCase().trim() === 'ok';
                });
                if (btnOk) btnOk.click();

                playBeep();
                st.innerText = '✔ Masuk: ' + kode + ' (Sisa: ' + extractedBatches.length + ')';
                await new Promise(function(r) { setTimeout(r, Math.floor(Math.random() * (2200 - 1200 + 1)) + 1200); });
            }

            if (isRunning) { st.innerText = '🎉 Selesai!'; }
            isRunning = false;
            releaseWakeLock();
            btnOn.style.opacity = '1';
            btnOff.style.opacity = '0.6';
            miniBadge.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            updateBadgeCount();
        };

        if (!window.ZXing) {
            var s = document.createElement('script');
            s.src = 'https://unpkg.com/@zxing/library@latest';
            document.head.appendChild(s);
        }

        function launchCameraScanner(onScanSuccess) {
            initAudio();
            if (!window.ZXing) { alert('Pustaka masih memuat.'); return; }
            toggleMinimize(true);

            var w = document.createElement('div');
            w.style.cssText = 'position:fixed;top:15px;left:15px;width:320px;z-index:999999;touch-action:none;';
            document.body.appendChild(w);

            var v = document.createElement('video');
            v.setAttribute('playsinline', ''); v.setAttribute('autoplay', ''); v.setAttribute('muted', '');
            v.style.cssText = 'width:320px;height:220px;border-radius:14px;border:2px solid #38bdf8;background:#000;object-fit:cover;display:block;box-shadow:0 10px 25px rgba(0,0,0,0.5);';
            w.appendChild(v);

            var cb = document.createElement('div');
            cb.style.cssText = 'display:flex;gap:4px;margin-top:6px;';
            w.appendChild(cb);

            var zb = document.createElement('button');
            zb.className = 'modern-btn';
            zb.innerText = '🔍 Zoom: 1x';
            zb.style.cssText = 'flex:1;padding:6px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;';
            cb.appendChild(zb);

            var fb = document.createElement('button');
            fb.className = 'modern-btn';
            fb.innerText = '🔦 Flash: OFF';
            fb.style.cssText = 'flex:1;padding:6px;background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;';
            cb.appendChild(fb);

            var cl = document.createElement('button');
            cl.className = 'modern-btn';
            cl.innerText = '✕ Tutup';
            cl.style.cssText = 'flex:1;padding:6px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;';
            cb.appendChild(cl);

            var hints = new Map();
            hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
            var r = new window.ZXing.BrowserMultiFormatReader(hints);
            var stream;

            function closeCam() {
                if (stream) { stream.getTracks().forEach(function(tr) { tr.stop(); }); }
                r.reset();
                w.remove();
                toggleMinimize(false);
            }

            cl.onclick = closeCam;

            navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}}).then(function(sStream) {
                stream = sStream;
                v.srcObject = stream;
                v.play();

                var tr = stream.getVideoTracks()[0];
                var cap = tr.getCapabilities ? tr.getCapabilities() : {};
                var zL = 1;
                var flashOn = false;

                zb.onclick = function() {
                    try {
                        if (!cap.zoom) { alert('Zoom tidak didukung.'); return; }
                        zL = zL >= 5 ? 1 : zL + 1;
                        tr.applyConstraints({advanced:[{zoom:zL}]});
                        zb.innerText = '🔍 Zoom: ' + zL + 'x';
                    } catch(e) {}
                };

                fb.onclick = function() {
                    try {
                        flashOn = !flashOn;
                        tr.applyConstraints({advanced:[{torch:flashOn}]});
                        fb.innerText = flashOn ? '🔦 ON' : '🔦 OFF';
                        fb.style.background = flashOn ? '#eab308' : 'rgba(255,255,255,0.1)';
                    } catch(e) {}
                };

                r.decodeFromStream(stream, v, function(res) {
                    if (res) {
                        playBeep();
                        closeCam();
                        onScanSuccess(res.text.trim());
                    }
                });
            }).catch(function(e) { alert('Gagal kamera: ' + e.message); w.remove(); toggleMinimize(false); });
        }

        btnQuickScan.onclick = function() {
            launchCameraScanner(function(kode) {
                searchInput.value = kode;
                doServerCheck(kode);
            });
        };

        btnScan.onclick = function() {
            launchCameraScanner(function(kode) {
                injectValue(kode);
                st.innerText = '✔ Scan Masuk: ' + kode;
                st.style.color = '#4ade80';
            });
        };

        btnSweepScan.onclick = function() {
            initAudio();
            if (!window.ZXing) { alert('Pustaka masih memuat.'); return; }
            toggleMinimize(true);

            var w = document.createElement('div');
            w.style.cssText = 'position:fixed;top:15px;left:15px;width:320px;z-index:999999;touch-action:none;';
            document.body.appendChild(w);

            var collectedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');

            var counterBadge = document.createElement('div');
            counterBadge.style.cssText = 'padding:8px 12px;background:rgba(15, 23, 42, 0.9);color:#38bdf8;border:1px solid rgba(56, 189, 248, 0.4);border-radius:10px;font-size:11px;font-weight:700;text-align:center;margin-bottom:6px;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
            counterBadge.innerText = '🔥 Terekam: ' + collectedBatches.length + ' batch';
            w.appendChild(counterBadge);

            var v = document.createElement('video');
            v.setAttribute('playsinline', ''); v.setAttribute('autoplay', ''); v.setAttribute('muted', '');
            v.style.cssText = 'width:320px;height:220px;border-radius:14px;border:2px solid #38bdf8;background:#000;object-fit:cover;display:block;box-shadow:0 10px 25px rgba(0,0,0,0.5);';
            w.appendChild(v);

            var cb = document.createElement('div');
            cb.style.cssText = 'display:flex;gap:4px;margin-top:6px;';
            w.appendChild(cb);

            var zb = document.createElement('button');
            zb.className = 'modern-btn';
            zb.innerText = '🔍 1x';
            zb.style.cssText = 'flex:1;padding:6px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;';
            cb.appendChild(zb);

            var fb = document.createElement('button');
            fb.className = 'modern-btn';
            fb.innerText = '🔦 OFF';
            fb.style.cssText = 'flex:1;padding:6px;background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;';
            cb.appendChild(fb);

            var cl = document.createElement('button');
            cl.className = 'modern-btn';
            cl.innerText = '💾 Selesai';
            cl.style.cssText = 'flex:1;padding:6px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;';
            cb.appendChild(cl);

            var r = new window.ZXing.BrowserMultiFormatReader();
            var stream;

            cl.onclick = function() {
                if (stream) { stream.getTracks().forEach(function(tr) { tr.stop(); }); }
                r.reset();
                w.remove();
                toggleMinimize(false);
                st.innerText = '💾 Tersimpan: ' + collectedBatches.length + ' batch';
                updateBadgeCount();
            };

            navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}}).then(function(sStream) {
                stream = sStream;
                v.srcObject = stream;
                v.play();

                var tr = stream.getVideoTracks()[0];
                var cap = tr.getCapabilities ? tr.getCapabilities() : {};
                var zL = 1;
                var flashOn = false;

                zb.onclick = function() {
                    try {
                        if (!cap.zoom) { alert('Zoom tidak didukung.'); return; }
                        zL = zL >= 5 ? 1 : zL + 1;
                        tr.applyConstraints({advanced:[{zoom:zL}]});
                        zb.innerText = '🔍 ' + zL + 'x';
                    } catch(e) {}
                };

                fb.onclick = function() {
                    try {
                        flashOn = !flashOn;
                        tr.applyConstraints({advanced:[{torch:flashOn}]});
                        fb.innerText = flashOn ? '🔦 ON' : '🔦 OFF';
                        fb.style.background = flashOn ? '#eab308' : 'rgba(255,255,255,0.1)';
                    } catch(e) {}
                };

                r.decodeFromStream(stream, v, function(res) {
                    if (res) {
                        var kode = res.text.trim();
                        if (/^[A-Z0-9]{8,15}$/.test(kode) && collectedBatches.indexOf(kode) === -1) {
                            collectedBatches.push(kode);
                            localStorage.setItem('tsiraw_saved_batches', JSON.stringify(collectedBatches));
                            playBeep();
                            updateBadgeCount();
                            counterBadge.innerText = '🔥 Terekam: ' + collectedBatches.length + ' batch (' + kode + ')';
                        }
                    }
                });
            }).catch(function(e) { alert('Gagal kamera: ' + e.message); w.remove(); toggleMinimize(false); });
        };

        updateBadgeCount();
    }

    initScript();

    var observerTimeout = null;
    const observer = new MutationObserver(function() {
        if (!observerTimeout) {
            observerTimeout = setTimeout(function() {
                initScript();
                observerTimeout = null;
            }, 2500);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();