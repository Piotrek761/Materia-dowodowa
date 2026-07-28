// ============================================
// Forum API Client — przez Vercel Serverless Function
// ============================================
// Wszystkie operacje GitHub API są wykonywane po stronie serwera (api/forum.js),
// dzięki czemu token GitHub nie jest widoczny w kodzie klienckim.
// ============================================

var GitHubAPI = (function() {
    'use strict';

    // Automatyczne wykrywanie — czy jesteśmy na Vercel, czy na GitHub Pages
    var API_URL = (function() {
        var host = window.location.hostname;
        // Jeśli jesteśmy na Vercel lub localhost — używamy względnego URL
        if (host.indexOf('vercel.app') !== -1 || host === 'localhost' || host === '127.0.0.1') {
            return '/api/forum';
        }
        // GitHub Pages lub inna domena — używamy absolutnego URL Vercel
        // Wymaga ustawienia FORUM_CONFIG.vercelApiUrl w js/config.js
        var baseUrl = (typeof FORUM_CONFIG !== 'undefined' && FORUM_CONFIG.vercelApiUrl)
            ? FORUM_CONFIG.vercelApiUrl
            : '/api/forum';  // fallback: względny (działa tylko na Vercel)
        return baseUrl + '/api/forum';
    })();

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
    // ============================================
    // Społeczność — API do spraw społeczności
    // ============================================
    var CASES_API = (function() {
        var host = window.location.hostname;
        if (host.indexOf('vercel.app') !== -1 || host === 'localhost' || host === '127.0.0.1') {
            return '/api/cases';
        }
        var baseUrl = (typeof FORUM_CONFIG !== 'undefined' && FORUM_CONFIG.vercelApiUrl)
            ? FORUM_CONFIG.vercelApiUrl
            : '/api/cases';
        return baseUrl + '/api/cases';
    })();

    function readCases(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CASES_API, true);
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

    function postCaseAction(action, payload, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CASES_API, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        payload.action = action;

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

    function writeTopics(topics, callback) {
        if (typeof callback === 'function') callback(null);
    }

    return {
        readTopics: readTopics,
        writeTopics: writeTopics,
        generateDeleteCode: generateDeleteCode,
        postAction: postAction,
        readCases: readCases,
        postCaseAction: postCaseAction
    };
})();
