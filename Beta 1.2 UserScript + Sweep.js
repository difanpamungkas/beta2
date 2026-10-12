// ==UserScript==
// @name         Beta 1.2 UserScript + Sweep
// @namespace    http://tampermonkey.net/
// @version      3.9
// @match        https://tsiraw.tsindustri.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function initScript() {
        if (document.getElementById('ds-floating-btn')) return;

        var fBtn = document.createElement('button');
        fBtn.id = 'ds-floating-btn';
        fBtn.innerText = '⚡ Buka Scanner Maraton';
        fBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:999999;background:#2E7D32;color:#fff;border:none;padding:10px 14px;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.3);';
        document.body.appendChild(fBtn);

        fBtn.onclick = function() {
            var panel = document.getElementById('ds-marathon-panel');
            if (panel) {
                panel.remove();
            } else {
                createControlPanel();
            }
        };
    }

    function createControlPanel() {
        if (document.getElementById('ds-marathon-panel')) return;

        var p = document.createElement('div');
        p.id = 'ds-marathon-panel';
        p.style.cssText = 'position:fixed;top:55px;right:10px;z-index:999999;background:rgba(0,0,0,0.92);padding:12px;border-radius:10px;display:flex;flex-direction:column;gap:8px;width:260px;box-shadow:0 4px 15px rgba(0,0,0,0.4);font-family:sans-serif;';
        document.body.appendChild(p);

        var title = document.createElement('div');
        title.innerText = '⚡ Beta 1.2 + Sweep';
        title.style.cssText = 'color:#fff;font-weight:bold;font-size:12px;text-align:center;margin-bottom:2px;';
        p.appendChild(title);

        var btnScan = document.createElement('button');
        btnScan.innerText = '⚡ BUKA SCANNER KAMERA';
        btnScan.style.cssText = 'padding:10px;background:#2E7D32;color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:12px;cursor:pointer;';
        p.appendChild(btnScan);

        var btnSweepScan = document.createElement('button');
        btnSweepScan.innerText = '📷 SAPU LEMBARAN KAMERA';
        btnSweepScan.style.cssText = 'padding:10px;background:#007AFF;color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:12px;cursor:pointer;';
        p.appendChild(btnSweepScan);

        var soundOn = JSON.parse(localStorage.getItem('tsiraw_sound_on') !== null ? localStorage.getItem('tsiraw_sound_on') : 'true');
        var btnSound = document.createElement('button');
        btnSound.innerText = soundOn ? '🔊 Suara Beep: ON' : '🔇 Suara Beep: OFF';
        btnSound.style.cssText = 'padding:6px;background:' + (soundOn ? '#0288D1' : '#444') + ';color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;';
        p.appendChild(btnSound);

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
            btnSound.style.background = soundOn ? '#0288D1' : '#444';
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
        filterInput.style.cssText = 'padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;font-size:11px;';
        p.appendChild(filterInput);

        var btnFetch = document.createElement('button');
        btnFetch.innerText = '📋 Ambil Nomor Batch Saja';
        btnFetch.style.cssText = 'padding:8px;background:#007AFF;color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;';
        p.appendChild(btnFetch);

        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;gap:6px;margin-top:2px;';
        p.appendChild(btnContainer);

        var btnOn = document.createElement('button');
        btnOn.innerText = '🟢 ON (Auto Input)';
        btnOn.style.cssText = 'flex:1;padding:8px;background:#2E7D32;color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;';
        btnContainer.appendChild(btnOn);

        var btnOff = document.createElement('button');
        btnOff.innerText = '🔴 OFF (Stop)';
        btnOff.style.cssText = 'flex:1;padding:8px;background:#C62828;color:#fff;border:none;border-radius:6px;font-weight:bold;font-size:11px;opacity:0.6;cursor:pointer;';
        btnContainer.appendChild(btnOff);

        var st = document.createElement('div');
        var savedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
        st.innerText = savedBatches.length > 0 ? '💾 Tersimpan: ' + savedBatches.length + ' batch' : 'Status: Siap';
        st.style.cssText = 'padding:5px;background:#111;color:#00FF00;text-align:center;border-radius:4px;font-size:10px;font-weight:bold;';
        p.appendChild(st);

        var closePanel = document.createElement('button');
        closePanel.innerText = '✕ Tutup Panel';
        closePanel.style.cssText = 'padding:4px;background:#444;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;margin-top:4px;';
        p.appendChild(closePanel);

        closePanel.onclick = function() { 
            p.remove(); 
        };

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
                                col.style.border = '2px solid #00FF00';
                            }
                        }
                    });
                }
            });

            localStorage.setItem('tsiraw_saved_batches', JSON.stringify(newBatches));

            if (newBatches.length === 0) {
                st.innerText = '⚠ Tidak ada nomor batch untuk "' + keyword + '"';
                st.style.color = '#FFA000';
            } else {
                st.innerText = '✔ Memori di-reset! Total baru: ' + newBatches.length + ' batch';
                st.style.color = '#00FF00';
            }
        };

        btnOff.onclick = function() {
            isRunning = false;
            btnOn.style.opacity = '1';
            btnOff.style.opacity = '0.6';
            st.innerText = 'Status: Auto Input Dihentikan (OFF)';
            st.style.color = '#FFA000';
        };

        btnOn.onclick = async function() {
            initAudio();
            var extractedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');
            if (extractedBatches.length === 0) {
                alert('Memori batch kosong! Silakan ambil batch baru dari tabel atau sapu lembar kamera terlebih dahulu.');
                return;
            }

            if (isRunning) return;
            isRunning = true;
            btnOn.style.opacity = '0.6';
            btnOff.style.opacity = '1';

            st.innerText = '⏳ Memulai Auto Input...';
            st.style.color = '#00FFFF';

            while (extractedBatches.length > 0 && isRunning) {
                var kode = extractedBatches.shift();
                localStorage.setItem('tsiraw_saved_batches', JSON.stringify(extractedBatches));
                await injectValue(kode);

                var btnOk = Array.from(document.querySelectorAll('button')).find(function(btn) {
                    return btn.innerText.toLowerCase().trim() === 'ok';
                });
                if (btnOk) btnOk.click();

                playBeep();
                st.innerText = '✔ Masuk: ' + kode + ' (Sisa: ' + extractedBatches.length + ')';
                st.style.color = '#00FF00';

                var humanDelay = Math.floor(Math.random() * (2200 - 1200 + 1)) + 1200;
                await new Promise(function(r) { setTimeout(r, humanDelay); });
            }

            if (isRunning) {
                st.innerText = '🎉 Selesai! Semua batch sukses di-input.';
                st.style.color = '#00FFFF';
            }

            isRunning = false;
            btnOn.style.opacity = '1';
            btnOff.style.opacity = '0.6';
        };

        if (!window.ZXing) {
            var s = document.createElement('script');
            s.src = 'https://unpkg.com/@zxing/library@latest';
            document.head.appendChild(s);
        }

        btnScan.onclick = function() {
            initAudio();
            if (!window.ZXing) {
                alert('Pustaka ZXing masih memuat, coba sesaat lagi.');
                return;
            }
            btnScan.style.display = 'none';

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
            v.style.cssText = 'width:320px;height:220px;border-radius:12px;border:3px solid #2E7D32;background:#000;object-fit:cover;display:block;';
            w.appendChild(v);

            var cb = document.createElement('div');
            cb.style.cssText = 'display:flex;gap:4px;margin-top:4px;';
            w.appendChild(cb);

            var zb = document.createElement('button');
            zb.innerText = '🔍 Zoom: 1x';
            zb.style.cssText = 'flex:1;padding:6px;background:#007AFF;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;';
            cb.appendChild(zb);

            var fb = document.createElement('button');
            fb.innerText = '🔦 Flash: OFF';
            fb.style.cssText = 'flex:1;padding:6px;background:#333;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;';
            cb.appendChild(fb);

            var cl = document.createElement('button');
            cl.innerText = '✕ Tutup';
            cl.style.cssText = 'flex:1;padding:6px;background:#C62828;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;';
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
                btnScan.style.display = 'block';
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
                        fb.style.background = flashOn ? '#E65100' : '#333';
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
                        st.style.color = '#00FF00';
                        setTimeout(function() { st.innerText = 'Status: Siap'; }, 1200);
                    }
                });
            }).catch(function(e) {
                alert('Gagal kamera: ' + e.message);
                w.remove();
                btnScan.style.display = 'block';
            });
        };

        btnSweepScan.onclick = function() {
            initAudio();
            if (!window.ZXing) {
                alert('Pustaka ZXing masih memuat, coba sesaat lagi.');
                return;
            }
            btnSweepScan.style.display = 'none';

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
            v.style.cssText = 'width:320px;height:220px;border-radius:12px;border:3px solid #007AFF;background:#000;object-fit:cover;display:block;';
            w.appendChild(v);

            var cb = document.createElement('div');
            cb.style.cssText = 'display:flex;gap:4px;margin-top:4px;';
            w.appendChild(cb);

            var zb = document.createElement('button');
            zb.innerText = '🔍 Zoom: 1x';
            zb.style.cssText = 'flex:1;padding:6px;background:#007AFF;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;';
            cb.appendChild(zb);

            var fb = document.createElement('button');
            fb.innerText = '🔦 Flash: OFF';
            fb.style.cssText = 'flex:1;padding:6px;background:#333;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;';
            cb.appendChild(fb);

            var cl = document.createElement('button');
            cl.innerText = '💾 Selesai';
            cl.style.cssText = 'flex:1;padding:6px;background:#2E7D32;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;';
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

            var collectedBatches = JSON.parse(localStorage.getItem('tsiraw_saved_batches') || '[]');

            cl.onclick = function() {
                if (stream) { stream.getTracks().forEach(function(tr) { tr.stop(); }); }
                r.reset();
                w.remove();
                btnSweepScan.style.display = 'block';
                st.innerText = '💾 Tersimpan: ' + collectedBatches.length + ' batch';
                st.style.color = '#00FF00';
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
                        fb.style.background = flashOn ? '#E65100' : '#333';
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
                            st.innerText = '🔥 Rekam: ' + kode + ' (Total: ' + collectedBatches.length + ')';
                            st.style.color = '#00FFFF';
                        }
                    }
                });
            }).catch(function(e) {
                alert('Gagal kamera: ' + e.message);
                w.remove();
                btnSweepScan.style.display = 'block';
            });
        };
    }

    initScript();

    const observer = new MutationObserver(function() {
        if (!document.getElementById('ds-floating-btn')) {
            initScript();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
