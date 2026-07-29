// ============================================
// Admin Panel — niezależny od app.js
// Rozszerzony panel moderacji dla administratora.
// ============================================

// Admin API URL — automatyczne wykrywanie środowiska
function getAdminApiUrl() {
    var host = window.location.hostname;
    if (host.indexOf('vercel.app') !== -1 || host.indexOf('localhost') !== -1 || host === '127.0.0.1') {
        return '/api/admin';
    }
    var base = (typeof FORUM_CONFIG !== 'undefined' && FORUM_CONFIG.vercelApiUrl)
        ? FORUM_CONFIG.vercelApiUrl
        : '/api/admin';
    return base + '/api/admin';
}

// ============================================
// Przełączanie panelu admina (z hasłem)
// ============================================
function toggleAdminPanel() {
    var p = document.getElementById('adminPanel');
    if (!p) return;
    if (p.style.display === 'block') {
        p.style.display = 'none';
        return;
    }
    var pw = prompt('Podaj haslo administratora:');
    if (pw === 'Materiadowodowa@2026') {
        p.style.display = 'block';
        adminFetchAll(); // Załaduj dane po otwarciu
    } else if (pw !== null) {
        alert('Nieprawidlowe haslo!');
    }
}

// ============================================
// Pomocnicze funkcje
// ============================================
function adminFeedback(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'ok' ? '#22c55e' : (type === 'err' ? '#ef4444' : 'inherit');
}

function adminEscapeHtml(text) {
    if (typeof text !== 'string') return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function adminToast(msg, type) {
    if (typeof showToast === 'function') {
        showToast('[Admin] ' + msg, type || 'info', 4000);
    } else {
        alert(msg);
    }
}

// ============================================
// Pobierz hasło od admina (do API)
// ============================================
function getAdminPassword() {
    return 'Materiadowodowa@2026';
}

// ============================================
// Wykonaj zapytanie do API admina
// ============================================
function adminApi(action, payload, callback) {
    payload = payload || {};
    payload.password = getAdminPassword();
    payload.action = action;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', getAdminApiUrl(), true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try { callback(null, JSON.parse(xhr.responseText)); }
            catch(e) { callback(null, {}); }
        } else {
            var em = 'Blad (HTTP ' + xhr.status + ')';
            try { var j = JSON.parse(xhr.responseText); if (j.error) em = j.error; } catch(e) {}
            callback(em, null);
        }
    };
    xhr.onerror = function() { callback('Blad sieci', null); };
    xhr.send(JSON.stringify(payload));
}

// ============================================
// Pobierz WSZYSTKIE dane z API
// ============================================
function adminFetchAll() {
    var statusEl = document.getElementById('adminStatus');
    if (statusEl) statusEl.textContent = 'Ladowanie danych...';

    var apiUrl = getAdminApiUrl();
    console.log('[Admin] Fetching from: ' + apiUrl + '?target=all');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl + '?target=all', true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var data = JSON.parse(xhr.responseText);
                adminRenderAll(data);
                if (statusEl) statusEl.textContent = 'Dane zaladowane (' + adminCountItems(data) + ' pozycji)';
            } catch(e) {
                if (statusEl) statusEl.textContent = 'Blad parsowania danych';
                console.error('[Admin] Parse error:', e, 'Response:', xhr.responseText.substring(0, 200));
            }
        } else {
            var errMsg = 'Blad ladowania (HTTP ' + xhr.status + ')';
            try {
                var errData = JSON.parse(xhr.responseText);
                if (errData.error) errMsg += ': ' + errData.error;
            } catch(e) {}
            if (statusEl) statusEl.textContent = errMsg;
            console.error('[Admin] HTTP ' + xhr.status + ':', xhr.responseText);
        }
    };
    xhr.onerror = function() {
        if (statusEl) statusEl.textContent = 'Blad sieci - sprawdz polaczenie i URL: ' + apiUrl;
        console.error('[Admin] Network error connecting to:', apiUrl);
    };
    xhr.send();
}

function adminCountItems(data) {
    var count = 0;
    if (data.official) {
        if (data.official.cases) count += data.official.cases.length;
        if (data.official.generators) count += data.official.generators.length;
    }
    if (data.community) count += data.community.length;
    if (data.verdicts) count += data.verdicts.length;
    return count;
}

// ============================================
// Wyrenderuj wszystkie sekcje w panelu admina
// ============================================
function adminRenderAll(data) {
    var container = document.getElementById('adminContentContainer');
    if (!container) return;

    var html = '';

    // === Oficjalne sprawy ===
    html += '<div class="admin-section"><h3 class="admin-section-title">Oficjalne sprawy</h3>';
    var officialCases = (data.official && data.official.cases) || [];
    if (officialCases.length === 0) {
        html += '<p class="admin-empty">Brak oficjalnych spraw.</p>';
    } else {
        officialCases.forEach(function(item, idx) {
            html += adminRenderItemCard(item, 'official-case', idx, {
                title: item.title,
                subtitle: item.sygnatura ? 'Sygn: ' + item.sygnatura : '',
                desc: item.desc
            });
        });
    }
    html += '</div>';

    // === Generatory ===
    html += '<div class="admin-section"><h3 class="admin-section-title">Generatory</h3>';
    var generators = (data.official && data.official.generators) || [];
    if (generators.length === 0) {
        html += '<p class="admin-empty">Brak generatorów.</p>';
    } else {
        generators.forEach(function(item, idx) {
            html += adminRenderItemCard(item, 'generator', idx, {
                title: item.title,
                subtitle: '',
                desc: item.desc
            });
        });
    }
    html += '</div>';

    // === Sprawy społeczności ===
    html += '<div class="admin-section"><h3 class="admin-section-title">Sprawy społeczności</h3>';
    var community = data.community || [];
    if (community.length === 0) {
        html += '<p class="admin-empty">Brak spraw społeczności.</p>';
    } else {
        community.forEach(function(item, idx) {
            html += adminRenderItemCard(item, 'community-case', idx, {
                title: item.title || item.name || 'Bez tytułu',
                subtitle: item.sygnatura ? 'Sygn: ' + item.sygnatura + ' | ' + (item.court || '') : (item.court || ''),
                desc: item.desc,
                badge: (item.format || '').toUpperCase()
            });
        });
    }
    html += '</div>';

    // === Orzeczenia ===
    html += '<div class="admin-section"><h3 class="admin-section-title">Orzeczenia</h3>';
    var verdicts = data.verdicts || [];
    if (verdicts.length === 0) {
        html += '<p class="admin-empty">Brak orzeczeń.</p>';
    } else {
        verdicts.forEach(function(item, idx) {
            html += adminRenderItemCard(item, 'verdict', idx, {
                title: item.title || 'Bez tytułu',
                subtitle: item.court || '',
                desc: item.desc,
                badge: 'PDF'
            });
        });
    }
    html += '</div>';

    container.innerHTML = html;
}

// ============================================
// Renderuj pojedynczą kartę elementu w panelu admina
// ============================================
function adminRenderItemCard(item, type, idx, info) {
    var descPreview = info.desc && info.desc.length > 120
        ? adminEscapeHtml(info.desc.substring(0, 120)) + '...'
        : (info.desc ? adminEscapeHtml(info.desc) : '');
    var badgeHtml = info.badge
        ? '<span class="admin-badge">' + info.badge + '</span>'
        : '';
    var dateStr = '';
    if (item.createdAt) {
        try { dateStr = new Date(item.createdAt).toLocaleDateString('pl-PL'); } catch(e) {}
    }

    return '<div class="admin-item" data-type="' + type + '" data-idx="' + idx + '" data-id="' + adminEscapeHtml(item.id || '') + '">' +
        '<div class="admin-item-header">' +
            '<strong>' + adminEscapeHtml(info.title) + '</strong>' +
            badgeHtml +
        '</div>' +
        (info.subtitle ? '<div class="admin-item-sub">' + adminEscapeHtml(info.subtitle) + '</div>' : '') +
        (descPreview ? '<div class="admin-item-desc">' + descPreview + '</div>' : '') +
        (dateStr ? '<div class="admin-item-date">' + dateStr + '</div>' : '') +
        '<div class="admin-item-actions">' +
            '<button class="admin-btn-edit" onclick="adminEditItem(\'' + type + '\',' + idx + ')" title="Edytuj">&#x270E; Edytuj</button>' +
            '<button class="admin-btn-delete" onclick="adminDeleteItem(\'' + type + '\',' + idx + ',\'' + adminEscapeHtml(item.id || '') + '\')" title="Usuń">&#x2716; Usuń</button>' +
            '<button class="admin-btn-file" onclick="adminReplaceFile(\'' + type + '\',' + idx + ',\'' + adminEscapeHtml(item.id || '') + '\')" title="Zastąp plik">&#x1F4C4; Plik</button>' +
        '</div>' +
    '</div>';
}

// ============================================
// Edytuj element (admin bypass)
// ============================================
function adminEditItem(type, idx) {
    var items = document.querySelectorAll('#adminContentContainer .admin-item[data-type="' + type + '"]');
    var itemEl = items[idx];
    if (!itemEl) return;
    var itemId = itemEl.getAttribute('data-id');

    // Pobierz dane z API ponownie (żeby mieć aktualne)
    var xhr = new XMLHttpRequest();
    xhr.open('GET', getAdminApiUrl() + '?target=all', true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = function() {
        if (xhr.status < 200 || xhr.status >= 300) return;
        try {
            var data = JSON.parse(xhr.responseText);
            var item = adminFindItem(data, type, idx, itemId);
            if (!item) { alert('Nie znaleziono elementu.'); return; }
            adminShowEditForm(type, idx, itemId, item);
        } catch(e) { alert('Blad parsowania danych.'); }
    };
    xhr.send();
}

function adminFindItem(data, type, idx, itemId) {
    var list = [];
    if (type === 'official-case' && data.official && data.official.cases) list = data.official.cases;
    else if (type === 'generator' && data.official && data.official.generators) list = data.official.generators;
    else if (type === 'community-case') list = data.community || [];
    else if (type === 'verdict') list = data.verdicts || [];

    if (itemId) {
        var found = list.find(function(x) { return x.id === itemId; });
        if (found) return found;
    }
    return list[idx] || null;
}

// ============================================
// Modal edycyjny dla admina (zamiast prompt)
// ============================================
function adminShowEditForm(type, idx, itemId, item) {
    var container = document.getElementById('adminEditFormContainer');
    if (!container) return;

    var typeLabel = type === 'official-case' ? 'Sprawa oficjalna' :
                    type === 'generator' ? 'Generator' :
                    type === 'community-case' ? 'Sprawa społeczności' : 'Orzeczenie';

    var fields = [];

    // Tytuł (input) — dla wszystkich
    fields.push({ id: 'admEdtTitle', label: 'Tytuł', type: 'input', value: item.title || '' });

    if (type === 'official-case' || type === 'community-case') {
        fields.push({ id: 'admEdtSygnatura', label: 'Sygnatura', type: 'input', value: item.sygnatura || '' });
    }

    if (type === 'community-case' || type === 'verdict') {
        fields.push({ id: 'admEdtCourt', label: 'Sąd', type: 'input', value: item.court || '' });
    }

    if (type === 'verdict') {
        fields.push({ id: 'admEdtPresiding', label: 'Przewodniczący', type: 'input', value: item.presiding || '' });
        fields.push({ id: 'admEdtJudge', label: 'Sędzia sprawozdawca', type: 'input', value: item.judge || '' });
        fields.push({ id: 'admEdtMember', label: 'Członkowie składu', type: 'input', value: item.member || '' });
    }

    // Opis (textarea) — dla wszystkich
    var descLabel = type === 'verdict' ? 'Sentencja' : 'Opis';
    fields.push({ id: 'admEdtDesc', label: descLabel, type: 'textarea', value: item.desc || '' });

    var html = '<div class="admin-modal-overlay" id="adminModalOverlay" onclick="adminCloseEditModal()">' +
        '<div class="admin-modal" onclick="event.stopPropagation()">' +
        '<div class="admin-modal-header">' +
            '<span class="admin-modal-title">&#x270E; Edytuj: <strong>' + adminEscapeHtml(item.title || '') + '</strong></span>' +
            '<button class="admin-modal-close" onclick="adminCloseEditModal()" title="Zamknij">&times;</button>' +
        '</div>' +
        '<div class="admin-modal-body">';

    for (var fi = 0; fi < fields.length; fi++) {
        var f = fields[fi];
        var escapedValue = adminEscapeHtml(f.value);
        html += '<div class="admin-modal-field">' +
            '<label for="' + f.id + '">' + f.label + '</label>';
        if (f.type === 'textarea') {
            html += '<textarea id="' + f.id + '" rows="6">' + escapedValue + '</textarea>';
        } else {
            html += '<input type="text" id="' + f.id + '" value="' + escapedValue + '">';
        }
        html += '</div>';
    }

    html += '</div>' +
        '<div class="admin-modal-footer">' +
            '<button class="admin-btn-cancel" onclick="adminCloseEditModal()">Anuluj</button>' +
            '<button class="admin-btn-save" onclick="adminSubmitEditForm(\'' + type + '\',' + idx + ',\'' + adminEscapeHtml(itemId || '') + '\')">&#x1F4BE; Zapisz zmiany</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    // Dodaj style modala (jednorazowo)
    if (!document.getElementById('adminModalStyles')) {
        var style = document.createElement('style');
        style.id = 'adminModalStyles';
        style.textContent = '.admin-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:11000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease}.admin-modal{background:var(--surface,#1a1a2e);border:1px solid var(--border,#2a2a4a);border-radius:var(--rs,12px);width:90%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)}.admin-modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border,#2a2a4a)}.admin-modal-title{font-size:0.95rem;color:var(--text,#e0e0e0)}.admin-modal-close{background:none;border:none;color:var(--text-muted,#888);font-size:1.5rem;cursor:pointer;padding:0 4px}.admin-modal-close:hover{color:var(--danger,#ef4444)}.admin-modal-body{padding:20px}.admin-modal-field{margin-bottom:14px}.admin-modal-field label{display:block;font-size:0.85rem;font-weight:600;color:var(--accent,#d4af37);margin-bottom:4px}.admin-modal-field input,.admin-modal-field textarea{width:100%;padding:10px 12px;background:var(--surface-2,#16162a);border:1px solid var(--border,#2a2a4a);border-radius:6px;color:var(--text,#e0e0e0);font-size:0.9rem;font-family:inherit;box-sizing:border-box}.admin-modal-field input:focus,.admin-modal-field textarea:focus{outline:none;border-color:var(--accent,#d4af37);box-shadow:0 0 0 2px rgba(212,175,55,0.15)}.admin-modal-field textarea{resize:vertical;min-height:80px}.admin-modal-footer{display:flex;gap:10px;justify-content:flex-end;padding:16px 20px;border-top:1px solid var(--border,#2a2a4a)}.admin-modal-footer button{padding:8px 20px;border-radius:6px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:all 0.2s}.admin-btn-cancel{background:transparent;border:1px solid var(--text-muted,#888);color:var(--text-muted,#888)}.admin-btn-cancel:hover{background:var(--text-muted,#888);color:#fff}.admin-btn-save{background:var(--accent,#d4af37);border:1px solid var(--accent,#d4af37);color:#1a1a2e}.admin-btn-save:hover{background:var(--accent-hover,#c5a032)}@keyframes fadeIn{from{opacity:0}to{opacity:1}}';
        document.head.appendChild(style);
    }

    container.innerHTML = html;
    container.style.display = 'block';

    // Auto-focus na pierwszym polu
    setTimeout(function() {
        var firstInput = container.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    }, 100);

    // ESC zamyka modal
    function onEditKeydown(e) {
        if (e.key === 'Escape' || e.code === 'Escape') {
            adminCloseEditModal();
        }
    }
    document.addEventListener('keydown', onEditKeydown);
    // Zapisz referencję, żeby móc usunąć listener później
    container._escHandler = onEditKeydown;
}

// ============================================
// Zamknij modal edycyjny
// ============================================
function adminCloseEditModal() {
    var container = document.getElementById('adminEditFormContainer');
    if (container) {
        // Usuń listener ESC
        if (container._escHandler) {
            document.removeEventListener('keydown', container._escHandler);
            delete container._escHandler;
        }
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// ============================================
// Zapisz formularz edycji z modala
// ============================================
function adminSubmitEditForm(type, idx, itemId) {
    var title = document.getElementById('admEdtTitle');
    if (!title || !title.value.trim()) {
        alert('Tytuł jest wymagany.');
        if (title) title.focus();
        return;
    }

    var payload = {
        manifest: (type === 'official-case' || type === 'generator') ? 'admin' :
                  (type === 'community-case') ? 'spolecznosc' : 'orzeczenia',
        itemId: itemId,
        itemIdx: idx,
        title: title.value.trim()
    };

    var getVal = function(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    };

    if (type === 'official-case' || type === 'community-case') {
        payload.sygnatura = getVal('admEdtSygnatura');
    }
    if (type === 'community-case' || type === 'verdict') {
        payload.court = getVal('admEdtCourt');
    }
    if (type === 'verdict') {
        payload.presiding = getVal('admEdtPresiding');
        payload.judge = getVal('admEdtJudge');
        payload.member = getVal('admEdtMember');
    }
    payload.desc = getVal('admEdtDesc');

    // Loading state na przycisku
    var saveBtn = document.querySelector('#adminEditFormContainer .admin-btn-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Zapisywanie...';
    }

    adminApi('moderateEdit', payload, function(err) {
        // Przywróć przycisk
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '&#x1F4BE; Zapisz zmiany';
        }
        if (err) { alert('Błąd: ' + err); return; }
        adminToast('Zaktualizowano: ' + payload.title, 'success');
        adminCloseEditModal();
        adminFetchAll();
    });
}

// ============================================
// Usuń element (admin bypass — bez kodu)
// ============================================
function adminDeleteItem(type, idx, itemId) {
    var typeName = type === 'official-case' ? 'oficjalna sprawe' :
                   type === 'generator' ? 'generator' :
                   type === 'community-case' ? 'sprawe spolecznosci' : 'orzeczenie';
    if (!confirm('Czy na pewno usunac ' + typeName + '? Tej operacji nie mozna cofnac.')) return;

    var manifest;
    if (type === 'official-case' || type === 'generator') manifest = 'admin';
    else if (type === 'community-case') manifest = 'spolecznosc';
    else if (type === 'verdict') manifest = 'orzeczenia';

    adminApi('moderateDelete', {
        manifest: manifest,
        itemId: itemId,
        itemIdx: idx
    }, function(err) {
        if (err) { alert('Blad usuwania: ' + err); return; }
        adminToast('Usunieto pomyslnie.', 'success');
        adminFetchAll();
    });
}

// ============================================
// Zastąp plik elementu
// ============================================
function adminReplaceFile(type, idx, itemId) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'verdict' ? '.pdf' : '.html,.pdf';
    input.onchange = function() {
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            var data = ev.target.result;
            var manifest;
            if (type === 'official-case' || type === 'generator') manifest = 'admin';
            else if (type === 'community-case') manifest = 'spolecznosc';
            else if (type === 'verdict') manifest = 'orzeczenia';

            if (manifest === 'admin') {
                // Dla admin - bezpośrednie zastąpienie pliku
                var xhr = new XMLHttpRequest();
                xhr.open('GET', getAdminApiUrl() + '?target=all', true);
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.onload = function() {
                    if (xhr.status < 200 || xhr.status >= 300) return;
                    try {
                        var json = JSON.parse(xhr.responseText);
                        var item = adminFindItem(json, type, idx, itemId);
                        if (!item || !item.filePath) {
                            alert('Nie znaleziono sciezki pliku.');
                            return;
                        }
                        // Zastąp plik
                        adminApi('replaceFile', {
                            filePath: item.filePath,
                            content: data,
                            message: 'Admin zastapil plik: ' + (item.title || '')
                        }, function(err) {
                            if (err) { alert('Blad: ' + err); return; }
                            adminToast('Plik zastapiony.', 'success');
                            adminFetchAll();
                        });
                    } catch(e) { alert('Blad.'); }
                };
                xhr.send();
            } else {
                // Dla spolecznosc/orzeczenia - przez moderateEdit
                var base64Content = data;
                adminApi('moderateEdit', {
                    manifest: manifest,
                    itemId: itemId,
                    itemIdx: idx,
                    data: base64Content
                }, function(err) {
                    if (err) { alert('Blad: ' + err); return; }
                    adminToast('Plik zastapiony.', 'success');
                    adminFetchAll();
                });
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// ============================================
// Obsługa dodawania sprawy (poprawiona)
// ============================================
function handleAdminAddCase() {
    var t = document.getElementById('adminCaseTitle');
    var s = document.getElementById('adminCaseSygnatura');
    var d = document.getElementById('adminCaseDesc');
    var f = document.getElementById('adminCaseFile');
    var fb = document.getElementById('adminCaseFeedback');
    if (!t || !t.value.trim()) { adminFeedback(fb, 'Wpisz tytul.', 'err'); return; }
    if (!f || !f.files || !f.files[0]) { adminFeedback(fb, 'Wybierz plik HTML.', 'err'); return; }
    var file = f.files[0];
    if (!file.name.toLowerCase().endsWith('.html')) { adminFeedback(fb, 'Tylko pliki HTML.', 'err'); return; }
    adminFeedback(fb, 'Wysylanie...', '');
    var btn = document.getElementById('adminAddCaseBtn');
    if (btn) btn.disabled = true;
    var reader = new FileReader();
    reader.onload = function(ev) {
        adminApi('addCase', {
            title: t.value.trim(),
            sygnatura: s ? s.value.trim() : '',
            desc: d ? d.value.trim() : '',
            htmlContent: ev.target.result
        }, function(err) {
            if (btn) btn.disabled = false;
            if (err) { adminFeedback(fb, err, 'err'); return; }
            adminFeedback(fb, 'OK! Opublikowane.', 'ok');
            t.value = ''; if(s) s.value = ''; if(d) d.value = ''; f.value = '';
            adminToast('Sprawa dodana do repozytorium!', 'success');
            adminFetchAll();
        });
    };
    reader.readAsText(file);
}

// ============================================
// Obsługa dodawania generatora (poprawiona)
// ============================================
function handleAdminAddGenerator() {
    var t = document.getElementById('adminGenTitle');
    var d = document.getElementById('adminGenDesc');
    var f = document.getElementById('adminGenFile');
    var fb = document.getElementById('adminGenFeedback');
    if (!t || !t.value.trim()) { adminFeedback(fb, 'Wpisz nazwe generatora.', 'err'); return; }
    if (!f || !f.files || !f.files[0]) { adminFeedback(fb, 'Wybierz plik HTML.', 'err'); return; }
    var file = f.files[0];
    if (!file.name.toLowerCase().endsWith('.html')) { adminFeedback(fb, 'Tylko pliki HTML.', 'err'); return; }
    adminFeedback(fb, 'Wysylanie...', '');
    var btn = document.getElementById('adminAddGeneratorBtn');
    if (btn) btn.disabled = true;
    var reader = new FileReader();
    reader.onload = function(ev) {
        adminApi('addGenerator', {
            title: t.value.trim(),
            desc: d ? d.value.trim() : '',
            htmlContent: ev.target.result
        }, function(err) {
            if (btn) btn.disabled = false;
            if (err) { adminFeedback(fb, err, 'err'); return; }
            adminFeedback(fb, 'OK! Opublikowane.', 'ok');
            t.value = ''; if(d) d.value = ''; f.value = '';
            adminToast('Generator dodany do repozytorium!', 'success');
            adminFetchAll();
        });
    };
    reader.readAsText(file);
}
