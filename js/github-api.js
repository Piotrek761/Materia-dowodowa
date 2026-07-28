// ============================================
// Forum API Client — przez Vercel Serverless Function
// ============================================
// Wszystkie operacje GitHub API są wykonywane po stronie serwera (api/forum.js),
// dzięki czemu token GitHub nie jest widoczny w kodzie klienckim.
// ============================================

var GitHubAPI = (function() {
    'use strict';

    var API_URL = '/api/forum';

    // Generuje losowy kod 8 znaków (dla awaryjnego użycia po stronie klienta)
    function generateDeleteCode() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ============================================
    // GET — pobierz tematy
    // ============================================
    function readTopics(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_URL, true);
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    callback(null, data);
                } catch (e) {
                    callback(null, []);
                }
            } else {
                var errMsg = 'Błąd serwera (HTTP ' + xhr.status + ')';
                try {
                    var errData = JSON.parse(xhr.responseText);
                    if (errData.error) errMsg = errData.error;
                } catch(e) {}
                callback(errMsg, null);
            }
        };

        xhr.onerror = function() {
            callback('Błąd sieci — nie można połączyć się z serwerem', null);
        };

        xhr.send();
    }

    // ============================================
    // POST — wykonaj akcję (create/delete/reply)
    // ============================================
    function postAction(action, payload, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', API_URL + '?action=' + encodeURIComponent(action), true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    callback(null, data);
                } catch (e) {
                    callback(null, { success: true });
                }
            } else {
                var errMsg = 'Błąd serwera (HTTP ' + xhr.status + ')';
                try {
                    var errData = JSON.parse(xhr.responseText);
                    if (errData.error) errMsg = errData.error;
                } catch(e) {}
                callback(errMsg, null);
            }
        };

        xhr.onerror = function() {
            callback('Błąd sieci — nie można połączyć się z serwerem', null);
        };

        xhr.send(JSON.stringify(payload));
    }

    // ============================================
    // Wrapper: zapisz tematy (przez POST create)
    // ============================================
    function writeTopics(topics, callback) {
        // Ta funkcja nie jest już używana bezpośrednio do zapisu
        // Zapis odbywa się przez postAction('create', ...) lub postAction('delete', ...)
        // Zachowujemy dla kompatybilności — symuluje sukces
        if (typeof callback === 'function') callback(null);
    }

    return {
        readTopics: readTopics,
        writeTopics: writeTopics,
        generateDeleteCode: generateDeleteCode,
        postAction: postAction
    };
})();
