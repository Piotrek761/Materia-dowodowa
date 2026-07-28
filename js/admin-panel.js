// ============================================
// Admin Panel — niezależny od app.js
// Ładowany jako osobny plik, żeby nie blokował
// reszty funkcjonalności strony.
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

// Przełączanie panelu admina (z hasłem)
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
    } else if (pw !== null) {
        alert('Nieprawidlowe haslo!');
    }
}

// Pomocnicza funkcja do wyświetlania feedbacku w formularzach
function adminFeedback(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'ok' ? '#22c55e' : (type === 'err' ? '#ef4444' : 'inherit');
}

// Obsługa dodawania sprawy
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
    btn.disabled = true;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var pw = prompt('Podaj haslo administratora:');
        if (!pw) { adminFeedback(fb, 'Anulowano.', ''); btn.disabled = false; return; }
        var xhr = new XMLHttpRequest();
        xhr.open('POST', getAdminApiUrl(), true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            btn.disabled = false;
            if (xhr.status >= 200 && xhr.status < 300) {
                adminFeedback(fb, 'OK! Opublikowane.', 'ok');
                t.value = ''; if(s) s.value = ''; if(d) d.value = ''; f.value = '';
                alert('Sprawa dodana do repozytorium!');
            } else {
                var em = 'Blad (HTTP ' + xhr.status + ')';
                try { var j = JSON.parse(xhr.responseText); if (j.error) em = j.error; } catch(e) {}
                adminFeedback(fb, em, 'err');
            }
        };
        xhr.onerror = function() { btn.disabled = false; adminFeedback(fb, 'Blad sieci.', 'err'); };
        xhr.send(JSON.stringify({ action: 'addCase', password: pw, title: t.value.trim(), sygnatura: s ? s.value.trim() : '', desc: d ? d.value.trim() : '', htmlContent: ev.target.result }));
    };
    reader.readAsText(file);
}

// Obsługa dodawania generatora
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
    btn.disabled = true;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var pw = prompt('Podaj haslo administratora:');
        if (!pw) { adminFeedback(fb, 'Anulowano.', ''); btn.disabled = false; return; }
        var xhr = new XMLHttpRequest();
        xhr.open('POST', getAdminApiUrl(), true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            btn.disabled = false;
            if (xhr.status >= 200 && xhr.status < 300) {
                adminFeedback(fb, 'OK! Opublikowane.', 'ok');
                t.value = ''; if(d) d.value = ''; f.value = '';
                alert('Generator dodany do repozytorium!');
            } else {
                var em = 'Blad (HTTP ' + xhr.status + ')';
                try { var j = JSON.parse(xhr.responseText); if (j.error) em = j.error; } catch(e) {}
                adminFeedback(fb, em, 'err');
            }
        };
        xhr.onerror = function() { btn.disabled = false; adminFeedback(fb, 'Blad sieci.', 'err'); };
        xhr.send(JSON.stringify({ action: 'addGenerator', password: pw, title: t.value.trim(), desc: d ? d.value.trim() : '', htmlContent: ev.target.result }));
    };
    reader.readAsText(file);
}
