// ==UserScript==
// @name         Beta 1.8.4 UserScript + Sweep + Gallery + WakeLock
// @namespace    http://tampermonkey.net/
// @version      4.8.0
// @match        https://tsiraw.tsindustri.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const customStyle = document.createElement('style');
    customStyle.innerHTML = `
        @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .modern-btn {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .modern-btn:active {
            transform: scale(0.92) !important;
        }
    `;
    document.head.appendChild(customStyle);

    var wakeLock = null;

    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log('Wake Lock Error:', err.message);
        }
    }

    function releaseWakeLock() {
        if (wakeLock !== null) {
            wakeLock.release().then(function() {
                wakeLock = null;
            });
        }
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
                existingBtns.forEach(function(el, idx) {
                    if (idx > 0) el.remove();
                });
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
            user-select: none; animation: pulseGlow 2s infinite;
        `;
        document.body.appendChild(fBtn);

        fBtn.onclick = function() {
            var panel = document.getElementById('ds-marathon-panel');
            if (panel) {
                panel.remove();
            } else {
                createControlPanel();
            }
        };

        updateBadgeCount();
    }

    function createControlPanel() {
        if (document.getElementById('ds-marathon-panel')) return;

        var p = document.createElement('div');
        p.id = 'ds-marathon-panel';
        p.style.cssText = `
            position: fixed; top: 68px; right: 12px; z-index: 999999;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px;
            width: 270px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
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
            animation: pulseGlow 2s infinite;
        `;
        miniBadge.innerText = '💀';
        p.appendChild(miniBadge);

        var panelContent = document.createElement('div');
        panelContent.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        p.appendChild(panelContent);

        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;';
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
                p.style.background = 'rgba(15, 23, 42, 0.92)';
                p.style.border = '1px solid rgba(255, 255, 255, 0.12)';
                p.style.padding = '14px';
                p.style.width = '270px';
                p.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5)';
                miniBadge.style.display = 'none';
            }
            updateBadgeCount();
        }

        btnMin.onclick = function() { toggleMinimize(true); };
        miniBadge.onclick = function() { toggleMinimize(false); };

        var btnScan = document.createElement('button');
        btnScan.className = 'modern-btn';
        btnScan.innerText = '📷 BUKA SCANNER KAMERA';
        btnScan.style.cssText = 'padding: 10px; background: linear-gradient(135deg, #059669, #10b981); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);';
        panelContent.appendChild(btnScan);

        var btnSweepScan = document.createElement('button');
        btnSweepScan.className = 'modern-btn';
        btnSweepScan.innerText = '⚡ SAPU LEMBARAN KAMERA';
        btnSweepScan.style.cssText = 'padding: 10px; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);';
        panelContent.appendChild(btnSweepScan);

        var btnGalleryScan = document.createElement('button');
        btnGalleryScan.className = 'modern-btn';
        btnGalleryScan.innerText = '🖼 SCAN DARI GALERI HP';
        btnGalleryScan.style.cssText = 'padding: 10px; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);';
        panelContent.appendChild(btnGalleryScan);

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        panelContent.appendChild(fileInput);

        btnGalleryScan.onclick = function() {
            initAudio();
            if (!window.ZXing) {
                alert('Pustaka ZXing masih memuat, coba sesaat lagi.');
                return;
            }
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
                        var hints = new Map();
                        var formats = [
                            window.ZXing.BarcodeFormat.CODE_128,
                            window.ZXing.BarcodeFormat.CODE_39,
                            window.ZXing.BarcodeFormat.EAN_13,
                            window.ZXing.BarcodeFormat.QR_CODE
                        ];
                        hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
                        hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);

                        var codeReader = new window.ZXing.BrowserMultiFormatReader(hints);
                        codeReader.decodeFromImageElement(img).then(function(result) {
                            if (result) {
                                var kode = result.text.trim();
                                var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
                                
                                if (savedBatches.indexOf(kode) === -1) {
                                    savedBatches.push(kode);
                                    localStorage.setItem('tsiraw_saved_batches', JSON.stringify(savedBatches));
                                    playBeep();
                                    updateBadgeCount();
                                    st.innerText = '✔ Foto Terbaca: ' + kode + ' (Total: ' + savedBatches.length + ')';
                                    st.style.color = '#4ade80';
                                } else {
                                    st.innerText = '⚠ Barcode ' + kode + ' sudah ada di memori!';
                                    st.style.color = '#fbbf24';
                                }
                            }
                        }).catch(function() {
                            alert('Gagal membaca barcode dari gambar. Pastikan gambar jelas dan tidak buram.');
                        });
                    } catch(err) {
                        alert('Error saat memproses gambar: ' + err.message);
                    }
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
        btnExportSweep.style.cssText = 'flex: 1; padding: 8px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer;';
        actionRow.appendChild(btnExportSweep);

        var btnClearSweep = document.createElement('button');
        btnClearSweep.className = 'modern-btn';
        btnClearSweep.innerText = '🗑 HAPUS MEMORI';
        btnClearSweep.style.cssText = 'flex: 1; padding: 8px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer;';
        actionRow.appendChild(btnClearSweep);

        btnExportSweep.onclick = function() {
            var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
            if (savedBatches.length === 0) {
                alert('Belum ada data sweep yang tersimpan!');
                return;
            }
            var textData = savedBatches.join('\n');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textData).then(function() {
                    alert('✔ Berhasil menyalin ' + savedBatches.length + ' barcode hasil sweep ke clipboard!');
                }).catch(function() {
                    prompt('Salin data sweep secara manual:', textData);
                });
            } else {
                prompt('Salin data sweep secara manual:', textData);
            }
        };

        btnClearSweep.onclick = function() {
            var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
            if (savedBatches.length === 0) {
                alert('Memori tersimpan sudah kosong!');
                return;
            }
            if (confirm('Yakin ingin menghapus seluruh ' + savedBatches.length + ' batch tersimpan?')) {
                localStorage.setItem('tsiraw_saved_batches', '[]');
                st.innerText = '🗑 Memori batch telah dikosongkan!';
                st.style.color = '#f87171';
                updateBadgeCount();
            }
        };

        var soundOn = JSON.parse(localStorage.getItem('tsiraw_sound_on') !== null ? localStorage.getItem('tsiraw_sound_on') : 'true');
        var btnSound = document.createElement('button');
        btnSound.className = 'modern-btn';
        btnSound.innerText = soundOn ? '🔊 Suara Beep: ON' : '🔇 Suara Beep: OFF';
        btnSound.style.cssText = 'padding: 6px; background: ' + (soundOn ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.05)') + '; color: ' + (soundOn ? '#38bdf8' : '#64748b') + '; border: 1px solid ' + (soundOn ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.08)') + '; border-radius: 8px; font-weight: 600; font-size: 11px; cursor: pointer;';
        panelContent.appendChild(btnSound);

        var audioCtx = null;
        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        btnSound.onclick = function() {
            soundOn = !soundOn;
            localStorage.setItem('tsiraw_sound_on', soundOn);
            btnSound.innerText = soundOn ? '🔊 Suara Beep: ON' : '🔇 Suara Beep: OFF';
            btnSound.style.background = soundOn ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.05)';
            btnSound.style.color = soundOn ? '#38bdf8' : '#64748b';
            btnSound.style.borderColor = soundOn ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.08)';
            if (soundOn) {
                initAudio();
                playBeep();
            }
        };

        function playBeep() {
            if (!soundOn) return;
            try {
                initAudio();
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 800;
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.15);
            } catch(e) {}
        }

        var filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Kategori (mis: Landscape / TSI)';
        filterInput.style.cssText = 'padding: 8px 10px; background: rgba(2, 6, 23, 0.6); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; font-size: 11px; outline: none;';
        panelContent.appendChild(filterInput);

        var btnFetch = document.createElement('button');
        btnFetch.className = 'modern-btn';
        btnFetch.innerText = '📋 Ambil Nomor Batch Saja';
        btnFetch.style.cssText = 'padding: 8px; background: rgba(255, 255, 255, 0.08); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; font-weight: 600; font-size: 11px; cursor: pointer;';
        panelContent.appendChild(btnFetch);

        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 6px; margin-top: 2px;';
        panelContent.appendChild(btnContainer);

        var btnOn = document.createElement('button');
        btnOn.className = 'modern-btn';
        btnOn.innerText = '🟢 ON (Auto)';
        btnOn.style.cssText = 'flex: 1; padding: 8px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);';
        btnContainer.appendChild(btnOn);

        var btnOff = document.createElement('button');
        btnOff.className = 'modern-btn';
        btnOff.innerText = '🔴 OFF (Stop)';
        btnOff.style.cssText = 'flex: 1; padding: 8px; background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; font-weight: 700; font-size: 11px; opacity: 0.6; cursor: pointer;';
        btnContainer.appendChild(btnOff);

        var st = document.createElement('div');
        var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
        st.innerText = savedBatches.length > 0 ? '💾 Tersimpan: ' + savedBatches.length + ' batch' : 'Status: Siap';
        st.style.cssText = 'padding: 6px 8px; background: rgba(2, 6, 23, 0.7); color: #38bdf8; text-align: center; border-radius: 8px; font-size: 10px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.05);';
        panelContent.appendChild(st);

        var closePanel = document.createElement('button');
        closePanel.className = 'modern-btn';
        closePanel.innerText = '✕ Tutup Panel';
        closePanel.style.cssText = 'padding: 4px; background: transparent; color: #64748b; border: none; font-size: 10px; cursor: pointer; margin-top: 2px;';
        panelContent.appendChild(closePanel);

        closePanel.onclick = function() { 
            p.remove(); 
        };

        var isRunning = false;

        window.addEventListener('offline', function() {
            if (isRunning) {
                st.innerText = '⚠️ Sinyal Terputus! Menunggu koneksi...';
                st.style.color = '#f87171';
            }
        });

        window.addEventListener('online', function() {
            if (isRunning) {
                st.innerText = '🟢 Koneksi Terhubung! Lanjut Auto Input...';
                st.style.color = '#38bdf8';
            }
        });

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
            if (!keyword) {
                alert('Masukkan kata kunci kategori terlebih dahulu!');
                return;
            }

            var rows = document.querySelectorAll('tr');
            var newBatches = [];

            rows.forEach(function(row) {
                var rowText = row.innerText.toLowerCase();
                if (rowText.indexOf(keyword) !== -1) {
                    var cols = row.querySelectorAll('td, th');
                    cols.forEach(function(col) {
                        var val = col.innerText.trim();
                        if (/^[A-Z0-9]{8,15}$/.test(val) && !val.includes('TEX') && !val.includes('NAME') && !val.toLowerCase().includes(keyword)) {
                            if (newBatches.indexOf(val) === -1) {
                                newBatches.push(val);
                                col.style.border = '2px solid #22c55e';
                            }
                        }
                    });
                }
            });

            localStorage.setItem('tsiraw_saved_batches', JSON.stringify(newBatches));
            updateBadgeCount();

            if (newBatches.length === 0) {
                st.innerText = '⚠ Tidak ada nomor batch untuk "' + keyword + '"';
                st.style.color = '#fbbf24';
            } else {
                st.innerText = '✔ Memori di-reset! Total baru: ' + newBatches.length + ' batch';
                st.style.color = '#4ade80';
            }
        };

        btnOff.onclick = function() {
            isRunning = false;
            releaseWakeLock();
            btnOn.style.opacity = '1';
            btnOff.style.opacity = '0.6';
            st.innerText = 'Status: Auto Input Dihentikan (OFF)';
            st.style.color = '#fbbf24';
            miniBadge.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            updateBadgeCount();
        };

        btnOn.onclick = async function() {
            initAudio();
            var extractedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
            if (extractedBatches.length === 0) {
                alert('Memori batch kosong! Silakan ambil batch baru dari tabel, galeri, atau sapu lembar kamera terlebih dahulu.');
                return;
            }

            if (isRunning) return;
            isRunning = true;
            await requestWakeLock();

            btnOn.style.opacity = '0.6';
            btnOff.style.opacity = '1';

            miniBadge.style.background = 'linear-gradient(135deg, #0284c7, #38bdf8)';

            st.innerText = '⏳ Memulai Auto Input (Layar Ditahan)...';
            st.style.color = '#38bdf8';

            while (extractedBatches.length > 0 && isRunning) {
                while (!navigator.onLine && isRunning) {
                    st.innerText = '⚠️ Sinyal Terputus! Menunggu koneksi...';
                    st.style.color = '#f87171';
                    await new Promise(function(r) { setTimeout(r, 1000); });
                }

                if (!isRunning) break;

                var kode = extractedBatches.shift();
                localStorage.setItem('tsiraw_saved_batches', JSON.stringify(extractedBatches));
                updateBadgeCount();
                await injectValue(kode);

                var btnOk = Array.from(document.querySelectorAll('button')).find(function(btn) {
                    return btn.innerText.toLowerCase().trim() === 'ok';
                });
                if (btnOk) btnOk.click();

                playBeep();
                st.innerText = '✔ Masuk: ' + kode + ' (Sisa: ' + extractedBatches.length + ')';
                st.style.color = '#4ade80';

                var humanDelay = Math.floor(Math.random() * (2200 - 1200 + 1)) + 1200;
                await new Promise(function(r) { setTimeout(r, humanDelay); });
            }

            if (isRunning) {
                st.innerText = '🎉 Selesai! Semua batch sukses di-input.';
                st.style.color = '#38bdf8';
            }

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

        // --- SCANNER KAMERA ---
        btnScan.onclick = function() {
            initAudio();
            if (!window.ZXing) {
                alert('Pustaka ZXing masih memuat, coba sesaat lagi.');
                return;
            }
            toggleMinimize(true);

            var w = document.createElement('div');
            w.style.cssText = 'position:fixed;top:15px;left:15px;width:320px;z-index:999999;touch-action:none;';
            document.body.appendChild(w);

            var isDragging = false, startX, startY, initX, initY;
            w.addEventListener('touchstart', function(e) {
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                initX = w.offsetLeft;
                initY = w.offsetTop;
            }, {passive: true});

            w.addEventListener('touchmove', function(e) {
                if (!isDragging) return;
                var dx = e.touches[0].clientX - startX;
                var dy = e.touches[0].clientY - startY;
                w.style.left = (initX + dx) + 'px';
                w.style.top = (initY + dy) + 'px';
            }, {passive: true});

            w.addEventListener('touchend', function() {
                isDragging = false;
            });

            var v = document.createElement('video');
            v.setAttribute('playsinline', ''); v.setAttribute('autoplay', ''); v.setAttribute('muted', '');
            v.style.cssText = 'width:320px;height:220px;border-radius:14px;border:2px solid #10b981;background:#000;object-fit:cover;display:block;box-shadow:0 10px 25px rgba(0,0,0,0.5);';
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

            var aw = setInterval(function() {
                var btns = document.querySelectorAll('button');
                for (var i = 0; i < btns.length; i++) {
                    var t = btns[i].innerText.trim().toUpperCase();
                    if (t === 'OK' || t === 'TUTUP' || t === 'CONFIRM') {
                        btns[i].click();
                        st.innerText = '⚠ Pop-up ditutup';
                        setTimeout(function() { st.innerText = 'Status: Siap'; }, 1000);
                    }
                }
            }, 300);

            var hints = new Map();
            var formats = [
                window.ZXing.BarcodeFormat.CODE_128,
                window.ZXing.BarcodeFormat.CODE_39,
                window.ZXing.BarcodeFormat.EAN_13,
                window.ZXing.BarcodeFormat.QR_CODE
            ];
            hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
            hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);

            var r = new window.ZXing.BrowserMultiFormatReader(hints);
            var stream;

            cl.onclick = function() {
                clearInterval(aw);
                if (stream) { stream.getTracks().forEach(function(tr) { tr.stop(); }); }
                r.reset();
                w.remove();
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
                        var minZ = 1;
                        var maxZ = 6;
                        zL = zL >= maxZ ? minZ : zL + 1;
                        tr.applyConstraints({advanced:[{zoom:zL}]});
                        zb.innerText = '🔍 Zoom: ' + zL + 'x';
                    } catch(e) { alert('Gagal zoom: ' + e.message); }
                };

                fb.onclick = function() {
                    try {
                        flashOn = !flashOn;
                        tr.applyConstraints({advanced:[{torch:flashOn}]});
                        fb.innerText = flashOn ? '🔦 Flash: ON' : '🔦 Flash: OFF';
                        fb.style.background = flashOn ? '#eab308' : 'rgba(255,255,255,0.1)';
                    } catch(e) {
                        alert('Flash tidak didukung di perangkat/browser ini.');
                    }
                };

                var lC = '', lT = 0;
                r.decodeFromStream(stream, v, function(res) {
                    if (res) {
                        var now = Date.now();
                        if (res.text === lC && (now - lT < 1500)) return;
                        lC = res.text; lT = now;
                        playBeep();
                        injectValue(res.text);
                        st.innerText = '✔ Scan Masuk: ' + res.text;
                        st.style.color = '#4ade80';
                        setTimeout(function() { st.innerText = 'Status: Siap'; }, 1200);
                    }
                });
            }).catch(function(e) {
                alert('Gagal kamera: ' + e.message);
                w.remove();
            });
        };

        // --- SWEEP KAMERA ---
        btnSweepScan.onclick = function() {
            initAudio();
            if (!window.ZXing) {
                alert('Pustaka ZXing masih memuat, coba sesaat lagi.');
                return;
            }
            toggleMinimize(true);

            var w = document.createElement('div');
            w.style.cssText = 'position:fixed;top:15px;left:15px;width:320px;z-index:999999;touch-action:none;';
            document.body.appendChild(w);

            var isDragging = false, startX, startY, initX, initY;
            w.addEventListener('touchstart', function(e) {
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                initX = w.offsetLeft;
                initY = w.offsetTop;
            }, {passive: true});

            w.addEventListener('touchmove', function(e) {
                if (!isDragging) return;
                var dx = e.touches[0].clientX - startX;
                var dy = e.touches[0].clientY - startY;
                w.style.left = (initX + dx) + 'px';
                w.style.top = (initY + dy) + 'px';
            }, {passive: true});

            w.addEventListener('touchend', function() {
                isDragging = false;
            });

            var collectedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');

            var counterBadge = document.createElement('div');
            counterBadge.style.cssText = 'padding:8px 12px;background:rgba(15, 23, 42, 0.9);color:#38bdf8;border:1px solid rgba(56, 189, 248, 0.4);border-radius:10px;font-size:11px;font-weight:700;text-align:center;margin-bottom:6px;box-shadow:0 4px 12px rgba(0,0,0,0.4);backdrop-filter:blur(8px);';
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
            cl.innerText = '💾 Selesai';
            cl.style.cssText = 'flex:1;padding:6px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;';
            cb.appendChild(cl);

            var hints = new Map();
            var formats = [
                window.ZXing.BarcodeFormat.CODE_128,
                window.ZXing.BarcodeFormat.CODE_39,
                window.ZXing.BarcodeFormat.EAN_13,
                window.ZXing.BarcodeFormat.QR_CODE
            ];
            hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
            hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);

            var r = new window.ZXing.BrowserMultiFormatReader(hints);
            var stream;

            cl.onclick = function() {
                if (stream) { stream.getTracks().forEach(function(tr) { tr.stop(); }); }
                r.reset();
                w.remove();
                st.innerText = '💾 Tersimpan: ' + collectedBatches.length + ' batch';
                st.style.color = '#4ade80';
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
                        var minZ = 1;
                        var maxZ = 6;
                        zL = zL >= maxZ ? minZ : zL + 1;
                        tr.applyConstraints({advanced:[{zoom:zL}]});
                        zb.innerText = '🔍 Zoom: ' + zL + 'x';
                    } catch(e) { alert('Gagal zoom: ' + e.message); }
                };

                fb.onclick = function() {
                    try {
                        flashOn = !flashOn;
                        tr.applyConstraints({advanced:[{torch:flashOn}]});
                        fb.innerText = flashOn ? '🔦 Flash: ON' : '🔦 Flash: OFF';
                        fb.style.background = flashOn ? '#eab308' : 'rgba(255,255,255,0.1)';
                    } catch(e) {
                        alert('Flash tidak didukung di perangkat/browser ini.');
                    }
                };

                r.decodeFromStream(stream, v, function(res) {
                    if (res) {
                        var kode = res.text.trim();
                        var isValidFormat = /^[A-Z0-9]{8,15}$/.test(kode);

                        if (isValidFormat && collectedBatches.indexOf(kode) === -1) {
                            collectedBatches.push(kode);
                            localStorage.setItem('tsiraw_saved_batches', JSON.stringify(collectedBatches));
                            playBeep();
                            updateBadgeCount();
                            
                            counterBadge.innerText = '🔥 Terekam: ' + collectedBatches.length + ' batch (' + kode + ')';
                            counterBadge.style.color = '#4ade80';
                            setTimeout(function() { counterBadge.style.color = '#38bdf8'; }, 800);

                            st.innerText = '🔥 Rekam: ' + kode + ' (Total: ' + collectedBatches.length + ')';
                            st.style.color = '#38bdf8';
                        }
                    }
                });
            }).catch(function(e) {
                alert('Gagal kamera: ' + e.message);
                w.remove();
            });
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
            }, 500);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();