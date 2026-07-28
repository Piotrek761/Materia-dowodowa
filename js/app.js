        (function () {
            'use strict';

            // ============================================
            // TAB SWITCHING
            // ============================================
            function switchTab(tabId) {
                // Wyczyść flagę edycji przy każdej zmianie zakładki
                window._editingCase = null;

                // Update content panels
                document.querySelectorAll('.tab-content').forEach(function (el) {
                    el.classList.remove('active');
                });
                var target = document.getElementById('tab-' + tabId);
                if (target) target.classList.add('active');

                // Update nav buttons
                document.querySelectorAll('.nav-item').forEach(function (el) {
                    el.classList.remove('active');
                    el.setAttribute('aria-selected', 'false');
                });
                var btn = document.querySelector('.nav-item[data-tab="' + tabId + '"]');
                if (btn) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');
                }

                // Scroll to top of content on mobile
                if (window.innerWidth <= 768) {
                    var mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }

            // Bind nav clicks (both event listeners and onclick attributes for compatibility)
            document.querySelectorAll('.nav-item').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    var tabId = this.getAttribute('data-tab');
                    if (tabId) switchTab(tabId);
                });
            });

            // Make switchTab globally accessible for inline onclick handlers
            window.switchTab = switchTab;

            // ============================================
            // SCROLL - Nav shadow + Scroll to top button
            // ============================================
            var topNav = document.getElementById('topNav');
            var scrollBtn = document.getElementById('scrollTopBtn');
            var scrollThreshold = 100;

            function handleScroll() {
                var scrollY = window.scrollY || window.pageYOffset;

                // Nav shadow on scroll
                if (topNav) {
                    if (scrollY > 10) {
                        topNav.classList.add('scrolled');
                    } else {
                        topNav.classList.remove('scrolled');
                    }
                }

                // Scroll-to-top button visibility
                if (scrollBtn) {
                    if (scrollY > scrollThreshold) {
                        scrollBtn.classList.add('visible');
                    } else {
                        scrollBtn.classList.remove('visible');
                    }
                }
            }

            window.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll(); // initial check

            // Scroll to top button click
            if (scrollBtn) {
                scrollBtn.addEventListener('click', function () {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }

            // ============================================
            // CARD MOUSE GLOW EFFECT
            // ============================================
            document.querySelectorAll('.card').forEach(function (card) {
                card.addEventListener('mousemove', function (e) {
                    var rect = card.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;
                    card.style.setProperty('--mx', x + 'px');
                    card.style.setProperty('--my', y + 'px');
                });
            });

            // ============================================
            // TOAST NOTIFICATIONS
            // ============================================
            window.showToast = function (message, type, duration) {
                if (!type) type = 'info';
                if (!duration) duration = 4000;

                var container = document.getElementById('toastContainer');
                if (!container) return;

                var toast = document.createElement('div');
                toast.className = 'toast ' + type;

                var iconMap = {
                    success: '\u2714',
                    error: '\u2716',
                    info: '\u2139'
                };

                toast.innerHTML =
                    '<span class="toast-icon" aria-hidden="true">' + (iconMap[type] || iconMap.info) + '</span>' +
                    '<span>' + document.createTextNode(message).textContent + '</span>' +
                    '<button class="toast-close" aria-label="Zamknij">&times;</button>';

                container.appendChild(toast);

                // Close button
                toast.querySelector('.toast-close').addEventListener('click', function () {
                    removeToast(toast);
                });

                // Auto remove
                var timeoutId = setTimeout(function () {
                    removeToast(toast);
                }, duration);

                // Store timeout ID and cancel on manual close
                toast._timeoutId = timeoutId;
            };

            function removeToast(toast) {
                if (toast._timeoutId) {
                    clearTimeout(toast._timeoutId);
                }
                toast.classList.add('removing');
                setTimeout(function () {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }

            // ============================================
            // UNIVERSAL SEARCH FILTER
            // ============================================
            function setupSearch(inputId, containerSelector) {
                var input = document.getElementById(inputId);
                if (!input) return;
                input.addEventListener('input', function () {
                    var filter = this.value.toLowerCase().trim();
                    var container = document.querySelector(containerSelector);
                    if (!container) return;
                    var items = container.querySelectorAll('.card, .info-card');
                    var visibleCount = 0;

                    items.forEach(function (item) {
                        var text = item.textContent.toLowerCase();
                        if (!filter || text.indexOf(filter) !== -1) {
                            item.style.display = '';
                            visibleCount++;
                        } else {
                            item.style.display = 'none';
                        }
                    });

                    // Handle empty states
                    var emptyStates = container.querySelectorAll('.empty-state');
                    emptyStates.forEach(function (es) {
                        es.style.display = (!filter || visibleCount === 0) ? '' : 'none';
                    });

                    // Clean up old "no results" messages
                    var oldNoResults = container.querySelectorAll('.filter-no-results');
                    oldNoResults.forEach(function (el) { el.remove(); });

                    // Show "no results" if filter active but nothing visible
                    if (filter && visibleCount === 0 && items.length > 0) {
                        var noRes = document.createElement('div');
                        noRes.className = 'empty-state filter-no-results';
                        noRes.style.marginTop = '24px';
                        noRes.innerHTML = '<div class="empty-state-title">Brak wyników</div><p>Nie znaleziono elementów pasujących do <strong>"' + escapeHtml(filter) + '"</strong>.</p>';
                        container.appendChild(noRes);
                    }
                });
            }

            setupSearch('sprawySearch', '#sprawyGrid');
            setupSearch('communitySearch', '#tab-community');
            setupSearch('verdictSearch', '#dynamic-verdicts');

            // ============================================
            // FORM HANDLING (Prześlij Orzeczenie)
            // ============================================
            var verdictForm = document.getElementById('verdictForm');
            if (verdictForm) {
                verdictForm.addEventListener('submit', function (e) {
                    e.preventDefault();

                    var title = document.getElementById('vTitle');
                    var court = document.getElementById('vCourt');
                    var desc = document.getElementById('vDesc');
                    var fileInput = document.getElementById('vFile');
                    var submitBtn = document.getElementById('submitVerdict');

                    // Clear previous feedback
                    document.querySelectorAll('.field-feedback').forEach(function (el) {
                        el.textContent = '';
                        el.className = 'field-feedback';
                    });
                    document.querySelectorAll('input.error, textarea.error, input.success, textarea.success')
                        .forEach(function (el) {
                            el.classList.remove('error', 'success');
                        });

                    // Validate
                    var hasError = false;
                    var fields = [
                        { el: title, feedback: document.getElementById('vTitle-feedback'), name: 'Tytuł' },
                        { el: court, feedback: document.getElementById('vCourt-feedback'), name: 'Sąd' },
                        { el: desc, feedback: document.getElementById('vDesc-feedback'), name: 'Sentencja' },
                        { el: fileInput, feedback: document.getElementById('vFile-feedback'), name: 'Plik PDF' }
                    ];

                    fields.forEach(function (field) {
                        if (!field.el.value || (field.el.type === 'file' && field.el.files.length === 0)) {
                            field.el.classList.add('error');
                            if (field.feedback) {
                                field.feedback.textContent = 'To pole jest wymagane.';
                                field.feedback.className = 'field-feedback error';
                            }
                            hasError = true;
                        } else {
                            field.el.classList.add('success');
                            if (field.feedback) {
                                field.feedback.textContent = '\u2714 Poprawnie wypełnione';
                                field.feedback.className = 'field-feedback success';
                            }
                        }
                    });

                    if (hasError) {
                        showToast('Proszę wypełnić wszystkie wymagane pola.', 'error', 4000);
                        return;
                    }

                    // Show loading state
                    submitBtn.disabled = true;
                    submitBtn.classList.add('loading');

                    // Wczytaj plik i wyślij przez API
                    var file = fileInput.files[0];
                    var reader = new FileReader();

                    reader.onload = function (ev) {
                        var presiding = document.getElementById('vPresiding');
                        var judge = document.getElementById('vJudge');
                        var member = document.getElementById('vMember');

                        var verdictData = {
                            title: title.value.trim(),
                            court: court.value.trim(),
                            desc: desc.value.trim(),
                            presiding: presiding ? presiding.value.trim() : '',
                            judge: judge ? judge.value.trim() : '',
                            member: member ? member.value.trim() : '',
                            fileName: file ? file.name : '',
                            data: ev.target.result,
                            size: file ? file.size : 0
                        };

                        // Wyślij przez API
                        if (typeof GitHubAPI !== 'undefined' && GitHubAPI.postVerdictAction) {
                            GitHubAPI.postVerdictAction('create', verdictData, function(err, result) {
                                submitBtn.disabled = false;
                                submitBtn.classList.remove('loading');

                                if (err) {
                                    showToast('Błąd wysyłania orzeczenia: ' + err, 'error', 5000);
                                } else {
                                    var serverCode = result && result.deleteCode ? result.deleteCode : 'BŁĄD-KODU';
                                    showToast('Orzeczenie zostało opublikowane w bazie!', 'success', 5000);
                                    showVerdictDeleteCodeDisplay(serverCode);

                                    // Zapisz kod
                                    try {
                                        var codes = JSON.parse(localStorage.getItem('md_verdict_codes') || '{}');
                                        codes['last'] = serverCode;
                                        localStorage.setItem('md_verdict_codes', JSON.stringify(codes));
                                    } catch(e) {}

                                    // Backup do localStorage
                                    try {
                                        var backup = JSON.parse(localStorage.getItem('md_verdicts') || '[]');
                                        verdictData.id = result && result.verdict ? result.verdict.id : 'v_backup_' + Date.now();
                                        verdictData.createdAt = new Date().toISOString();
                                        verdictData.privateCode = serverCode;
                                        backup.unshift(verdictData);
                                        if (backup.length > 50) backup.length = 50;
                                        localStorage.setItem('md_verdicts', JSON.stringify(backup));
                                    } catch(e) {}

                                    loadVerdicts();
                                }

                                verdictForm.reset();
                                document.querySelectorAll('.field-feedback').forEach(function (el) {
                                    el.textContent = ''; el.className = 'field-feedback';
                                });
                                document.querySelectorAll('input.success, textarea.success').forEach(function (el) {
                                    el.classList.remove('success');
                                });
                                switchTab('orzecznictwo');
                            });
                        } else {
                            // Fallback: localStorage
                            var verdicts = JSON.parse(localStorage.getItem('md_verdicts') || '[]');
                            var localId = 'local_' + Date.now();
                            verdictData.id = localId;
                            verdictData.createdAt = new Date().toISOString();
                            verdicts.unshift(verdictData);
                            localStorage.setItem('md_verdicts', JSON.stringify(verdicts));

                            submitBtn.disabled = false;
                            submitBtn.classList.remove('loading');
                            showToast('Orzeczenie dodane lokalnie (tryb offline)', 'info', 5000);

                            verdictForm.reset();
                            document.querySelectorAll('.field-feedback').forEach(function (el) {
                                el.textContent = ''; el.className = 'field-feedback';
                            });
                            document.querySelectorAll('input.success, textarea.success').forEach(function (el) {
                                el.classList.remove('success');
                            });
                            loadVerdicts();
                            switchTab('orzecznictwo');
                        }
                    };

                    if (file) {
                        reader.readAsDataURL(file);
                    } else {
                        // Bez pliku — wyślij tylko metadane
                        reader.onload({ target: { result: '' } });
                    }
                });
            }

            // Helper: escape HTML
            function escapeHtml(text) {
                var div = document.createElement('div');
                div.appendChild(document.createTextNode(text));
                return div.innerHTML;
            }

            // Real-time validation feedback on blur
            document.querySelectorAll('#verdictForm input, #verdictForm textarea').forEach(function (el) {
                el.addEventListener('blur', function () {
                    var feedbackId = this.id + '-feedback';
                    var feedback = document.getElementById(feedbackId);
                    if (!feedback) return;

                    if (this.value.trim() !== '' && !(this.type === 'file' && this.files.length === 0)) {
                        this.classList.remove('error');
                        this.classList.add('success');
                        feedback.textContent = '\u2714 Poprawnie wypełnione';
                        feedback.className = 'field-feedback success';
                    } else if (this.value.trim() === '' && this.hasAttribute('required') && this.type !==
                    'file') {
                        this.classList.remove('success');
                        this.classList.add('error');
                        feedback.textContent = 'To pole jest wymagane.';
                        feedback.className = 'field-feedback error';
                    }
                });

                // Clear error on input
                el.addEventListener('input', function () {
                    if (this.classList.contains('error')) {
                        this.classList.remove('error');
                        var feedbackId = this.id + '-feedback';
                        var feedback = document.getElementById(feedbackId);
                        if (feedback) {
                            feedback.textContent = '';
                            feedback.className = 'field-feedback';
                        }
                    }
                });
            });

            // File input: show file name
            var vFile = document.getElementById('vFile');
            if (vFile) {
                vFile.addEventListener('change', function () {
                    var feedback = document.getElementById('vFile-feedback');
                    if (!feedback) return;
                    if (this.files.length > 0) {
                        var name = this.files[0].name;
                        var size = (this.files[0].size / 1024).toFixed(1);
                        feedback.textContent = '\u2714 Wybrano: ' + name + ' (' + size + ' KB)';
                        feedback.className = 'field-feedback success';
                        this.classList.remove('error');
                        this.classList.add('success');
                    } else {
                        feedback.textContent = '';
                        feedback.className = 'field-feedback';
                        this.classList.remove('success');
                    }
                });
            }

            // ============================================
            // KEYBOARD NAVIGATION for tabs (Arrow keys)
            // ============================================
            var navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(function (item, index) {
                item.addEventListener('keydown', function (e) {
                    var target = null;
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        target = navItems[(index + 1) % navItems.length];
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        target = navItems[(index - 1 + navItems.length) % navItems.length];
                    } else if (e.key === 'Home') {
                        e.preventDefault();
                        target = navItems[0];
                    } else if (e.key === 'End') {
                        e.preventDefault();
                        target = navItems[navItems.length - 1];
                    }
                    if (target) {
                        target.focus();
                        target.click();
                    }
                });
            });

        })();

        // ============================================
        // ============================================
        // CREATOR CARD CLICK HANDLERS
        // ============================================
        (function() {
            var cardPdf = document.getElementById('creatorCardPdf');
            var cardHtml = document.getElementById('creatorCardHtml');
            var formContainer = document.getElementById('creatorFormContainer');
            var formTitle = document.getElementById('creatorFormTitle');
            var ccFormat = document.getElementById('ccFormat');
            var ccFile = document.getElementById('ccFile');
            var cancelBtn = document.getElementById('creatorFormCancel');

            function showCreatorForm(format) {
                if (!formContainer || !formTitle || !ccFormat || !ccFile) return;
                formContainer.style.display = 'block';
                ccFormat.value = format;

                // Reset file input when switching format
                ccFile.value = '';
                var fileInfo = document.getElementById('ccFileInfo');
                if (fileInfo) { fileInfo.style.display = 'none'; fileInfo.innerHTML = ''; }
                var fileText = document.getElementById('ccFileText');
                if (fileText) fileText.textContent = 'Kliknij, aby wybrać plik';
                var fileHint = document.getElementById('ccFileHint');
                if (fileHint) fileHint.textContent = 'lub przeciągnij i upuść plik tutaj';

                if (format === 'pdf') {
                    formTitle.textContent = 'Formularz zgłoszenia — plik PDF';
                    ccFile.accept = '.pdf';
                } else {
                    formTitle.textContent = 'Formularz zgłoszenia — plik HTML';
                    ccFile.accept = '.html';
                }

                formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            if (cardPdf) {
                cardPdf.addEventListener('click', function () { showCreatorForm('pdf'); });
            }
            if (cardHtml) {
                cardHtml.addEventListener('click', function () { showCreatorForm('html'); });
            }
            if (cancelBtn && formContainer) {
                cancelBtn.addEventListener('click', function () {
                    formContainer.style.display = 'none';
                    window._editingCase = null;
                    var form = document.getElementById('communityCaseForm');
                    if (form) form.reset();
                    var info = document.getElementById('ccFileInfo');
                    if (info) { info.style.display = 'none'; info.innerHTML = ''; }
                    var text = document.getElementById('ccFileText');
                    if (text) text.textContent = 'Kliknij, aby wybrać plik';
                    var hint = document.getElementById('ccFileHint');
                    if (hint) hint.textContent = 'lub przeciągnij i upuść plik tutaj';
                    // Scroll to top of kreator tab
                    document.querySelector('#tab-kreator .section-head').scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
        })();

        // ============================================
        // COMMUNITY CASE SUBMISSION (localStorage) - NEW
        // ============================================
        (function() {
            var communityForm = document.getElementById('communityCaseForm');
            if (!communityForm) return;

            // File input: show file name on selection
            var ccFile = document.getElementById('ccFile');
            var ccFileZone = document.getElementById('ccFileZone');
            var ccFileInfo = document.getElementById('ccFileInfo');

            if (ccFile && ccFileZone) {
                ccFileZone.addEventListener('click', function (e) {
                    if (e.target !== ccFile) ccFile.click();
                });

                // Drag and drop support
                ccFileZone.addEventListener('dragover', function (e) {
                    e.preventDefault();
                    this.classList.add('dragover');
                });

                ccFileZone.addEventListener('dragleave', function () {
                    this.classList.remove('dragover');
                });

                ccFileZone.addEventListener('drop', function (e) {
                    e.preventDefault();
                    this.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) {
                        ccFile.files = e.dataTransfer.files;
                        updateFileInfo(ccFile);
                    }
                });

                ccFile.addEventListener('change', function () {
                    updateFileInfo(this);
                });

                function updateFileInfo(input) {
                    if (input.files.length > 0) {
                        var f = input.files[0];
                        var sizeKB = (f.size / 1024).toFixed(1);
                        var ext = f.name.split('.').pop().toUpperCase();
                        ccFileInfo.style.display = 'block';
                        ccFileInfo.innerHTML = '&#x2714; Wybrano: <strong>' + escapeHtml(f.name) + '</strong> (' + sizeKB + ' KB, ' + ext + ')';
                        document.getElementById('ccFileText').textContent = escapeHtml(f.name);
                        document.getElementById('ccFileHint').textContent = 'Kliknij, aby zmienić plik';
                        ccFileInfo.style.borderColor = 'var(--success)';
                        ccFileInfo.style.color = 'var(--success)';

                        var feedback = document.getElementById('ccFile-feedback');
                        if (feedback) {
                            feedback.textContent = '';
                            feedback.className = 'field-feedback';
                        }
                    }
                }
            }

            // Validity feedback on blur for all fields
            communityForm.querySelectorAll('input, textarea, select').forEach(function (el) {
                el.addEventListener('blur', function () {
                    var feedbackId = this.id + '-feedback';
                    var feedback = document.getElementById(feedbackId);
                    if (!feedback) return;

                    if (this.value.trim() !== '') {
                        this.classList.remove('error');
                        this.classList.add('success');
                        feedback.textContent = '&#x2714; Poprawnie wypełnione';
                        feedback.className = 'field-feedback success';
                    } else if (this.hasAttribute('required')) {
                        this.classList.remove('success');
                        this.classList.add('error');
                        feedback.textContent = 'To pole jest wymagane.';
                        feedback.className = 'field-feedback error';
                    }
                });

                el.addEventListener('input', function () {
                    if (this.classList.contains('error')) {
                        this.classList.remove('error');
                        var feedbackId = this.id + '-feedback';
                        var feedback = document.getElementById(feedbackId);
                        if (feedback) {
                            feedback.textContent = '';
                            feedback.className = 'field-feedback';
                        }
                    }
                });
            });

            // Form submit — przez API do GitHub
            communityForm.addEventListener('submit', function (e) {
                e.preventDefault();

                // Sprawdź czy to edycja istniejącej sprawy
                if (window._editingCase) {
                    var ec = window._editingCase;
                    window._editingCase = null;

                    var edTitle = document.getElementById('ccTitle').value.trim();
                    var edSygnatura = document.getElementById('ccSygnatura').value.trim();
                    var edCourt = document.getElementById('ccCourt').value.trim();
                    var edType = document.getElementById('ccType').value;
                    var edPower = document.getElementById('ccPower').value.trim();
                    var edDefendant = document.getElementById('ccDefendant').value.trim();
                    var edDesc = document.getElementById('ccDesc').value.trim();
                    var edAuthor = document.getElementById('ccAuthor').value.trim();

                    if (typeof GitHubAPI !== 'undefined' && GitHubAPI.postCaseAction) {
                        GitHubAPI.postCaseAction('edit', {
                            caseIdx: ec.idx,
                            code: ec.code,
                            title: edTitle,
                            sygnatura: edSygnatura,
                            court: edCourt,
                            type: edType,
                            power: edPower,
                            defendant: edDefendant,
                            desc: edDesc,
                            author: edAuthor
                        }, function(err) {
                            if (err) {
                                showToast('Błąd aktualizacji: ' + err, 'error', 5000);
                            } else {
                                showToast('Sprawa zaktualizowana!', 'success', 4000);
                            }
                            loadCommunityCases();
                        });
                    } else {
                        showToast('API niedostępne — edycja tylko lokalnie.', 'info', 4000);
                    }

                    // Reset form
                    communityForm.reset();
                    if (ccFileInfo) {
                        ccFileInfo.style.display = 'none';
                        ccFileInfo.innerHTML = '';
                    }
                    document.getElementById('ccFileText').textContent = 'Kliknij, aby wybrać plik (PDF lub HTML)';
                    document.getElementById('ccFileHint').textContent = 'lub przeciągnij i upuść plik tutaj';
                    communityForm.querySelectorAll('.field-feedback').forEach(function (el) {
                        el.textContent = ''; el.className = 'field-feedback';
                    });
                    communityForm.querySelectorAll('input.success, textarea.success, select.success').forEach(function (el) {
                        el.classList.remove('success');
                    });
                    switchTab('community');
                    return;
                }

                var title = document.getElementById('ccTitle');
                var sygnatura = document.getElementById('ccSygnatura');
                var court = document.getElementById('ccCourt');
                var ctype = document.getElementById('ccType');
                var power = document.getElementById('ccPower');
                var defendant = document.getElementById('ccDefendant');
                var desc = document.getElementById('ccDesc');
                var ccFile = document.getElementById('ccFile');
                var author = document.getElementById('ccAuthor');
                var submitBtn = document.getElementById('submitCommunityCaseBtn');

                // Clear previous feedback
                communityForm.querySelectorAll('.field-feedback').forEach(function (el) {
                    el.textContent = '';
                    el.className = 'field-feedback';
                });
                communityForm.querySelectorAll('input.error, textarea.error, select.error, input.success, textarea.success, select.success').forEach(function (el) {
                    el.classList.remove('error', 'success');
                });

                // Validate required fields
                var required = [
                    { el: title, feedback: document.getElementById('ccTitle-feedback'), name: 'Tytuł' },
                    { el: sygnatura, feedback: document.getElementById('ccSygnatura-feedback'), name: 'Sygnatura' },
                    { el: court, feedback: document.getElementById('ccCourt-feedback'), name: 'Sąd' },
                    { el: ctype, feedback: document.getElementById('ccType-feedback'), name: 'Rodzaj sprawy' },
                    { el: power, feedback: document.getElementById('ccPower-feedback'), name: 'Powód' },
                    { el: defendant, feedback: document.getElementById('ccDefendant-feedback'), name: 'Pozwany' },
                    { el: desc, feedback: document.getElementById('ccDesc-feedback'), name: 'Opis' }
                ];

                var hasError = false;
                required.forEach(function (field) {
                    if (!field.el.value || field.el.value === '') {
                        field.el.classList.add('error');
                        if (field.feedback) {
                            field.feedback.textContent = 'To pole jest wymagane.';
                            field.feedback.className = 'field-feedback error';
                        }
                        hasError = true;
                    } else {
                        field.el.classList.add('success');
                        if (field.feedback) {
                            field.feedback.textContent = '&#x2714; Poprawnie wypełnione';
                            field.feedback.className = 'field-feedback success';
                        }
                    }
                });

                // Validate file
                if (!ccFile.files || ccFile.files.length === 0) {
                    hasError = true;
                    var fileFeedback = document.getElementById('ccFile-feedback');
                    if (fileFeedback) {
                        fileFeedback.textContent = 'Wybierz plik z teczką sprawy.';
                        fileFeedback.className = 'field-feedback error';
                    }
                    if (ccFileInfo) {
                        ccFileInfo.style.borderColor = 'var(--danger)';
                        ccFileInfo.style.color = 'var(--danger)';
                    }
                }

                if (hasError) {
                    showToast('Proszę wypełnić wszystkie wymagane pola i wybrać plik.', 'error', 4000);
                    return;
                }

                // Show loading
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');

                var file = ccFile.files[0];
                var reader = new FileReader();
                reader.onload = function (ev) {
                    var format = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'html';
                    var typeLabels = {
                        'gospodarcza': 'Gospodarcza',
                        'cywilna': 'Cywilna',
                        'upadlosciowa': 'Upadłościowa',
                        'restrukturyzacyjna': 'Restrukturyzacyjna',
                        'pracownicza': 'Pracownicza',
                        'administracyjna': 'Administracyjna',
                        'inna': 'Inna'
                    };

                    var caseData = {
                        title: title.value.trim(),
                        sygnatura: sygnatura.value.trim(),
                        court: court.value.trim(),
                        type: typeLabels[ctype.value] || ctype.value,
                        power: power.value.trim(),
                        defendant: defendant.value.trim(),
                        desc: desc.value.trim(),
                        author: author.value.trim() || 'Użytkownik społeczności',
                        format: format,
                        fileName: file.name,
                        data: ev.target.result,
                        size: file.size
                    };

                    // Wyślij przez API
                    if (typeof GitHubAPI !== 'undefined' && GitHubAPI.postCaseAction) {
                        GitHubAPI.postCaseAction('create', caseData, function(err, result) {
                            submitBtn.disabled = false;
                            submitBtn.classList.remove('loading');

                            if (err) {
                                showToast('Błąd publikacji: ' + err, 'error', 5000);
                            } else {
                                var serverCode = result && result.deleteCode ? result.deleteCode : 'BŁĄD-KODU';
                                showToast('Sprawa "' + title.value.trim() + '" została opublikowana!', 'success', 5000);
                                // Pokaż i zapisz kod usuwania w przeglądarce
                                showCommunityDeleteCodeDisplay(serverCode);

                                // Backup do localStorage (na wypadek gdyby GET się nie powiódł)
                                try {
                                    var backup = JSON.parse(localStorage.getItem('md_community_cases') || '[]');
                                    caseData.id = result && result.caseData ? result.caseData.id : 'backup_' + Date.now();
                                    caseData.createdAt = new Date().toISOString();
                                    caseData.privateCode = serverCode;
                                    backup.unshift(caseData);
                                    // Zachowaj ostatnie 50 dla bezpieczeństwa
                                    if (backup.length > 50) backup.length = 50;
                                    localStorage.setItem('md_community_cases', JSON.stringify(backup));
                                } catch(e) {}

                                // Odśwież listę spraw
                                loadCommunityCases();
                            }

                            // Reset form
                            communityForm.reset();
                            if (ccFileInfo) {
                                ccFileInfo.style.display = 'none';
                                ccFileInfo.innerHTML = '';
                            }
                            document.getElementById('ccFileText').textContent = 'Kliknij, aby wybrać plik (PDF lub HTML)';
                            document.getElementById('ccFileHint').textContent = 'lub przeciągnij i upuść plik tutaj';
                            communityForm.querySelectorAll('.field-feedback').forEach(function (el) {
                                el.textContent = ''; el.className = 'field-feedback';
                            });
                            communityForm.querySelectorAll('input.success, textarea.success, select.success').forEach(function (el) {
                                el.classList.remove('success');
                            });

                            switchTab('community');
                        });
                    } else {
                        // Fallback: localStorage
                        var cases = JSON.parse(localStorage.getItem('md_community_cases') || '[]');
                        cases.unshift(caseData);
                        localStorage.setItem('md_community_cases', JSON.stringify(cases));

                        submitBtn.disabled = false;
                        submitBtn.classList.remove('loading');
                        showToast('Sprawa dodana lokalnie (tryb offline)', 'info', 5000);
                        communityForm.reset();
                        if (ccFileInfo) {
                            ccFileInfo.style.display = 'none';
                            ccFileInfo.innerHTML = '';
                        }
                        document.getElementById('ccFileText').textContent = 'Kliknij, aby wybrać plik (PDF lub HTML)';
                        document.getElementById('ccFileHint').textContent = 'lub przeciągnij i upuść plik tutaj';
                        communityForm.querySelectorAll('.field-feedback').forEach(function (el) {
                            el.textContent = ''; el.className = 'field-feedback';
                        });
                        communityForm.querySelectorAll('input.success, textarea.success, select.success').forEach(function (el) {
                            el.classList.remove('success');
                        });
                        loadCommunityCases();
                        switchTab('community');
                    }
                };
                reader.readAsDataURL(file);
            });
        })();

        window.loadCommunityCases = function () {
            var pdfGrid = document.getElementById('community-pdf-grid');
            var htmlGrid = document.getElementById('community-html-grid');
            if (!pdfGrid || !htmlGrid) return;

            if (typeof GitHubAPI !== 'undefined' && GitHubAPI.readCases) {
                GitHubAPI.readCases(function(err, data) {
                    if (!err && data && Array.isArray(data)) {
                        window._communityCases = data;
                        renderCommunityCases(data, pdfGrid, htmlGrid);
                    } else {
                        // Fallback: localStorage
                        var local = JSON.parse(localStorage.getItem('md_community_cases') || '[]');
                        window._communityCases = local;
                        renderCommunityCases(local, pdfGrid, htmlGrid);
                    }
                });
            } else {
                var local = JSON.parse(localStorage.getItem('md_community_cases') || '[]');
                window._communityCases = local;
                renderCommunityCases(local, pdfGrid, htmlGrid);
            }
        };

        // ============================================
        // Renderuj sprawy społeczności (z API lub localStorage)
        // ============================================
        function renderCommunityCases(cases, pdfGrid, htmlGrid) {
            pdfGrid.innerHTML = '';
            htmlGrid.innerHTML = '';

            var pdfCases = cases.filter(function (c) { return c.format === 'pdf'; });
            var htmlCases = cases.filter(function (c) { return c.format === 'html'; });

            function formatSize(bytes) {
                if (!bytes) return '0 B';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / 1048576).toFixed(1) + ' MB';
            }

            function getGlobalCaseIndex(c) {
                // Znajdź globalny indeks sprawy w pełnej tablicy
                var all = [];
                if (typeof window._communityCases !== 'undefined' && Array.isArray(window._communityCases)) {
                    all = window._communityCases;
                }
                for (var gi = 0; gi < all.length; gi++) {
                    if (all[gi] === c || (all[gi].id && c.id && all[gi].id === c.id)) {
                        return gi;
                    }
                }
                return -1;
            }

            function renderCaseCard(c, idx, grid) {
                var date = new Date(c.createdAt || c.uploadedAt || Date.now());
                var dateStr = date.toLocaleDateString('pl-PL');
                var badgeColor = c.format === 'pdf' ? '#ef4444' : '#22c55e';
                var badgeLabel = c.format === 'pdf' ? 'PDF' : 'HTML';

                var card = document.createElement('div');
                card.className = 'card';
                card.style.animation = 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

                var isLegacy = !c.title;

                if (isLegacy) {
                    var legacyDate = new Date(c.uploadedAt || Date.now());
                    var legacyDateStr = legacyDate.toLocaleDateString('pl-PL');
                    card.innerHTML =
                        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">' +
                            '<h3 style="margin-bottom:0;flex:1;">' + escapeHtml(c.name || 'Bez tytułu') + '</h3>' +
                            '<span style="font-size:0.75rem;padding:3px 10px;border-radius:4px;background:' + badgeColor + '20;color:' + badgeColor + ';border:1px solid ' + badgeColor + '40;font-weight:600;">' + badgeLabel + '</span>' +
                        '</div>' +
                        '<p style="font-size:0.95rem;color:var(--text-muted);">Sprawa przesłana w starszym formacie &mdash; brak pełnych danych.</p>' +
                        '<p style="font-size:0.85rem;color:var(--text-muted);margin-top:auto;padding-top:10px;">Dodano: ' + legacyDateStr + ' &bull; ' + escapeHtml(c.name || '') + ' (' + formatSize(c.size) + ')</p>' +
                        '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">' +
                            '<a href="' + (c.fileUrl || c.data || '#') + '" target="_blank" class="btn-action" style="font-size:0.85rem;" rel="noopener">' +
                                '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3v10"/><path d="M7 7l3-4 3 4"/><path d="M2 15v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg> Otwórz</a>' +
                        '</div>';
                } else {
                    var typeHtml = c.type ? '<p><strong>Typ:</strong> ' + escapeHtml(c.type) + '</p>' : '';
                    var authorHtml = c.author && c.author !== 'Użytkownik społeczności' ? '<p><strong>Autor:</strong> ' + escapeHtml(c.author) + '</p>' : '';

                    card.innerHTML =
                        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">' +
                            '<h3 style="margin-bottom:0;flex:1;">' + escapeHtml(c.title) + '</h3>' +
                            '<span style="font-size:0.75rem;padding:3px 10px;border-radius:4px;background:' + badgeColor + '20;color:' + badgeColor + ';border:1px solid ' + badgeColor + '40;font-weight:600;">' + badgeLabel + '</span>' +
                        '</div>' +
                        '<p><strong>Sygnatura:</strong> ' + escapeHtml(c.sygnatura) + '</p>' +
                        '<p><strong>Sąd:</strong> ' + escapeHtml(c.court) + '</p>' +
                        typeHtml +
                        '<p><strong>Powód:</strong> ' + escapeHtml(c.power) + '</p>' +
                        '<p><strong>Pozwany:</strong> ' + escapeHtml(c.defendant) + '</p>' +
                        authorHtml +
                        '<p style="margin-top:8px;">' + escapeHtml(c.desc) + '</p>' +
                        '<p style="font-size:0.85rem;color:var(--text-muted);margin-top:auto;padding-top:10px;">Dodano: ' + dateStr + ' &bull; ' + (c.fileName ? escapeHtml(c.fileName) : '') + ' (' + formatSize(c.size) + ')</p>' +
                        '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">' +
                            '<a href="' + (c.fileUrl || c.data || '#') + '" target="_blank" class="btn-action" style="font-size:0.85rem;" rel="noopener">' +
                                '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3v10"/><path d="M7 7l3-4 3 4"/><path d="M2 15v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg> Otwórz teczkę</a>' +
                            '<button class="case-edit-btn" data-idx="' + getGlobalCaseIndex(c) + '" data-format="' + (c.format || 'html') + '" title="Edytuj sprawę" style="background:none;border:1px solid var(--border);color:var(--accent);cursor:pointer;padding:4px 12px;font-size:0.85rem;border-radius:6px;transition:var(--t-fast);">&#x270E; Edytuj</button>' +
                            '<button class="case-del-btn" data-idx="' + getGlobalCaseIndex(c) + '" title="Usuń sprawę" style="background:none;border:1px solid var(--danger);color:var(--danger);cursor:pointer;padding:4px 12px;font-size:0.85rem;border-radius:6px;transition:var(--t-fast);">&#x2716; Usuń</button>' +
                        '</div>';
                }

                grid.appendChild(card);
            }

            if (pdfCases.length === 0) {
                pdfGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-title">Brak spraw PDF</div><p>Żadna sprawa w formacie PDF nie została jeszcze opublikowana. Skorzystaj z kreatora w zakładce <strong>Stwórz</strong>, aby przesłać własną!</p></div>';
            } else {
                pdfCases.forEach(function (c, i) { renderCaseCard(c, i, pdfGrid); });
            }

            if (htmlCases.length === 0) {
                htmlGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-title">Brak spraw HTML</div><p>Żadna sprawa w formacie HTML nie została jeszcze opublikowana. Skorzystaj z kreatora w zakładce <strong>Stwórz</strong>, aby przesłać własną!</p></div>';
            } else {
                htmlCases.forEach(function (c, i) { renderCaseCard(c, i, htmlGrid); });
            }

            // Dodaj handler usuwania z kodem
            document.querySelectorAll('.case-del-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = parseInt(this.getAttribute('data-idx'));
                    showCommunityDeleteModal('temat', idx);
                });
            });

            // Dodaj handler edycji z kodem
            document.querySelectorAll('.case-edit-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = parseInt(this.getAttribute('data-idx'));
                    showCommunityEditModal(idx);
                });
            });
        }

        // ============================================
        // COMMUNITY CASES — delete/edit with code
        // ============================================
        function showCommunityDeleteCodeDisplay(code) {
            var modal = document.getElementById('deleteCodeDisplayModal');
            var display = document.getElementById('deleteCodeDisplay');
            var closeBtn = document.getElementById('deleteCodeDisplayCloseBtn');
            if (!modal || !display) return;

            display.textContent = code;
            modal.style.display = 'flex';

            // Zapisz kod w przeglądarce
            try {
                var saved = JSON.parse(localStorage.getItem('md_case_codes') || '{}');
                saved['last'] = code;
                localStorage.setItem('md_case_codes', JSON.stringify(saved));
            } catch(e) {}

            function close() {
                modal.style.display = 'none';
                closeBtn.removeEventListener('click', close);
            }
            closeBtn.addEventListener('click', close);
        }

        function getCaseCode(caseId) {
            if (!caseId) return null;
            try {
                var saved = JSON.parse(localStorage.getItem('md_case_codes') || '{}');
                return saved[caseId] || saved['last'] || null;
            } catch(e) { return null; }
        }

        function saveCaseCode(caseId, code) {
            if (!caseId || !code) return;
            try {
                var saved = JSON.parse(localStorage.getItem('md_case_codes') || '{}');
                saved[caseId] = code;
                saved['last'] = code;
                localStorage.setItem('md_case_codes', JSON.stringify(saved));
            } catch(e) {}
        }

        function removeCaseCode(caseId) {
            if (!caseId) return;
            try {
                var saved = JSON.parse(localStorage.getItem('md_case_codes') || '{}');
                delete saved[caseId];
                localStorage.setItem('md_case_codes', JSON.stringify(saved));
            } catch(e) {}
        }

        function showCommunityDeleteModal(idx) {
            // Pobierz sprawy (z obu źródeł)
            var allCases = [];
            if (typeof window._communityCases !== 'undefined' && Array.isArray(window._communityCases)) {
                allCases = window._communityCases;
            } else {
                try { allCases = JSON.parse(localStorage.getItem('md_community_cases') || '[]'); } catch(e) {}
            }

            var c = allCases[idx];
            if (!c) {
                showToast('Nie znaleziono sprawy.', 'error', 3000);
                return;
            }

            var modal = document.getElementById('deleteCodeModal');
            var input = document.getElementById('deleteCodeInput');
            var feedback = document.getElementById('deleteCodeFeedback');
            var confirmBtn = document.getElementById('deleteCodeConfirmBtn');
            var cancelBtn = document.getElementById('deleteCodeCancelBtn');
            var title = document.getElementById('deleteModalTitle');
            var desc = document.getElementById('deleteModalDesc');

            if (!modal || !input) return;

            title.textContent = 'Usuń sprawę społeczności';
            desc.textContent = 'Aby usunąć tę sprawę, wpisz kod usuwania, który otrzymałeś przy publikacji.';

            // Auto-uzupełnij kod
            var savedCode = c.id ? getCaseCode(c.id) : getCaseCode('last');
            input.value = savedCode || '';
            feedback.textContent = savedCode ? 'Kod automatycznie wczytany' : '';
            feedback.className = savedCode ? 'field-feedback success' : 'field-feedback';
            modal.style.display = 'flex';

            function cleanup() {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            }

            function handleConfirm() {
                var code = input.value.trim().toUpperCase();
                if (!code) {
                    feedback.textContent = 'Wpisz kod usuwania.';
                    feedback.className = 'field-feedback error';
                    return;
                }

                // Wyślij do API
                if (typeof GitHubAPI !== 'undefined' && GitHubAPI.postCaseAction) {
                    GitHubAPI.postCaseAction('delete', {
                        caseIdx: idx,
                        code: code
                    }, function(err) {
                        cleanup();
                        if (err) {
                            showToast('Błąd: ' + err, 'error', 5000);
                        } else {
                            showToast('Sprawa została usunięta.', 'success', 4000);
                            if (c.id) removeCaseCode(c.id);
                            loadCommunityCases();
                        }
                    });
                } else {
                    // Fallback: usuń z localStorage
                    cleanup();
                    if (c.id && c.id.toString().indexOf('local') !== -1) {
                        // Lokalna sprawa — tylko admin bypass
                        if (code === 'ADMIN') {
                            var local = JSON.parse(localStorage.getItem('md_community_cases') || '[]');
                            local.splice(idx, 1);
                            localStorage.setItem('md_community_cases', JSON.stringify(local));
                            showToast('Sprawa usunięta lokalnie.', 'info', 3000);
                            loadCommunityCases();
                        } else {
                            showToast('Nieprawidłowy kod (tryb offline: ADMIN).', 'error', 4000);
                        }
                    } else {
                        showToast('API niedostępne — nie można usunąć.', 'error', 4000);
                    }
                }
            }

            function handleCancel() {
                cleanup();
            }

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);

            input.addEventListener('keydown', function onEnter(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                }
            });

            setTimeout(function() { input.focus(); }, 100);
        }

        function showCommunityEditModal(idx) {
            var allCases = [];
            if (typeof window._communityCases !== 'undefined' && Array.isArray(window._communityCases)) {
                allCases = window._communityCases;
            } else {
                try { allCases = JSON.parse(localStorage.getItem('md_community_cases') || '[]'); } catch(e) {}
            }

            var c = allCases[idx];
            if (!c) {
                showToast('Nie znaleziono sprawy.', 'error', 3000);
                return;
            }

            var modal = document.getElementById('deleteCodeModal');
            var input = document.getElementById('deleteCodeInput');
            var feedback = document.getElementById('deleteCodeFeedback');
            var confirmBtn = document.getElementById('deleteCodeConfirmBtn');
            var cancelBtn = document.getElementById('deleteCodeCancelBtn');
            var mTitle = document.getElementById('deleteModalTitle');
            var mDesc = document.getElementById('deleteModalDesc');

            if (!modal || !input) return;

            mTitle.textContent = 'Edytuj sprawę społeczności';
            mDesc.textContent = 'Aby edytować sprawę, wpisz kod otrzymany przy publikacji. Po weryfikacji zostaniesz przeniesiony do formularza.';

            var savedCode = c.id ? getCaseCode(c.id) : getCaseCode('last');
            input.value = savedCode || '';
            feedback.textContent = savedCode ? 'Kod automatycznie wczytany' : '';
            feedback.className = savedCode ? 'field-feedback success' : 'field-feedback';
            modal.style.display = 'flex';

            function cleanup() {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            }

            function handleConfirm() {
                var code = input.value.trim().toUpperCase();
                if (!code) {
                    feedback.textContent = 'Wpisz kod edycji.';
                    feedback.className = 'field-feedback error';
                    return;
                }

                cleanup();

                // Ustaw flagę edycji — submit handler wyśle EDIT zamiast CREATE
                window._editingCase = { idx: idx, code: code };

                // Wypełnij formularz danymi sprawy
                var titleField = document.getElementById('ccTitle');
                var sygnaturaField = document.getElementById('ccSygnatura');
                var courtField = document.getElementById('ccCourt');
                var typeField = document.getElementById('ccType');
                var powerField = document.getElementById('ccPower');
                var defendantField = document.getElementById('ccDefendant');
                var descField = document.getElementById('ccDesc');
                var authorField = document.getElementById('ccAuthor');
                var formContainer = document.getElementById('creatorFormContainer');

                if (titleField) titleField.value = c.title || '';
                if (sygnaturaField) sygnaturaField.value = c.sygnatura || '';
                if (courtField) courtField.value = c.court || '';
                if (typeField) typeField.value = c.type || '';
                if (powerField) powerField.value = c.power || '';
                if (defendantField) defendantField.value = c.defendant || '';
                if (descField) descField.value = c.desc || '';
                if (authorField) authorField.value = c.author || '';

                if (formContainer) formContainer.style.display = 'block';
                formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

                showToast('Dane sprawy wczytane. Zmodyfikuj i wyślij formularz, aby zaktualizować.', 'info', 5000);
            }

            function handleCancel() {
                window._editingCase = null;
                cleanup();
            }

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);

            input.addEventListener('keydown', function onEnter(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                }
            });

            setTimeout(function() { input.focus(); }, 100);
        }

        // Dynamic nav height tracking
        function updateNavHeight() {
            var nav = document.getElementById('topNav');
            if (nav) {
                var h = nav.offsetHeight;
                document.body.style.paddingTop = h + 'px';
                document.documentElement.style.setProperty('--nav-h', h + 'px');
            }
        }
        updateNavHeight();
        window.addEventListener('load', updateNavHeight);
        window.addEventListener('resize', updateNavHeight);

// ============================================
        // LEGAL CODES DATABASE
        // ============================================
        var WSPOLCZESNE = [
    { title: 'Kodeks Spółek Handlowych', date: '2000-09-15', desc: 'Ustawa regulująca ustrój prawny spółek handlowych.', isap: 'WDU20000941037' },
    { title: 'Kodeks Karny', date: '1997-06-06', desc: 'Określa zasady odpowiedzialności karnej oraz katalog przestępstw.', isap: 'WDU19970880553' },
    { title: 'Prawo upadłościowe', date: '2003-02-28', desc: 'Normuje postępowanie upadłościowe i restrukturyzacyjne.', isap: 'WDU20030600535' },
    { title: 'Zwalczanie nieuczciwej konkurencji', date: '1993-04-16', desc: 'Chroni przedsiębiorców przed czynami nieuczciwej konkurencji.', isap: 'WDU19930470211' },
    { title: 'Prawo bankowe', date: '1997-08-29', desc: 'Reguluje działalność bankową, funkcjonowanie banków i nadzór.', isap: 'WDU19971400952' },
    { title: 'Ochrona danych osobowych / RODO', date: '2018-05-10', desc: 'Wdraża przepisy RODO do polskiego porządku prawnego.', isap: 'WDU20180001000' },
    { title: 'Ordynacja podatkowa', date: '1997-08-29', desc: 'Reguluje zobowiązania podatkowe i postępowanie podatkowe.', isap: 'WDU19971370926' },
    { title: 'Kodeks Karny Skarbowy', date: '1999-09-10', desc: 'Określa przestępstwa i wykroczenia skarbowe.', isap: 'WDU19990830930' },
    { title: 'Prawo przedsiębiorców', date: '2018-03-06', desc: 'Podstawowy akt regulujący działalność gospodarczą.', isap: 'WDU20180000646' },
    { title: 'Kodeks Cywilny', date: '1964-04-23', desc: 'Fundamentalny akt regulujący stosunki cywilnoprawne (ciągle obowiązuje).', isap: 'WDU19640160093' },
    { title: 'Kodeks Postępowania Cywilnego', date: '1964-11-17', desc: 'Określa procedurę przed sądami powszechnymi.', isap: 'WDU19640430296' },
    { title: 'Kodeks Pracy', date: '1974-06-26', desc: 'Reguluje prawa i obowiązki pracowników i pracodawców.', isap: 'WDU19740240141' },
    { title: 'Kodeks postępowania administracyjnego', date: '1960-06-14', desc: 'Normuje postępowanie przed organami administracji.', isap: 'WDU19600300168' },
    { title: 'Prawo o ustroju sądów powszechnych', date: '2001-07-27', desc: 'Organizacja i kompetencje sądów powszechnych.', isap: 'WDU20010981070' },
    { title: 'Ustawa o Sądzie Najwyższym', date: '2017-12-08', desc: 'Określa organizację i właściwość Sądu Najwyższego.', isap: 'WDU20180000005' },
    { title: 'Ustawa o Krajowym Rejestrze Sądowym', date: '1997-08-20', desc: 'Reguluje funkcjonowanie KRS.', isap: 'WDU19970500515' },
    { title: 'Ustawa o rachunkowości', date: '1994-09-29', desc: 'Zasady rachunkowości i sprawozdawczości finansowej.', isap: 'WDU19940121591' },
    { title: 'Prawo zamówień publicznych', date: '2019-09-11', desc: 'Reguluje udzielanie zamówień publicznych.', isap: 'WDU20190002019' },
    { title: 'Prawo autorskie i prawa pokrewne', date: '1994-02-04', desc: 'Ochrona praw twórców i utworów.', isap: 'WDU19940240083' },
    { title: 'Prawo własności przemysłowej', date: '2001-06-30', desc: 'Ochrona wynalazków, wzorów i znaków towarowych.', isap: 'WDU20010119111' },
    { title: 'PIT – podatek dochodowy od osób fizycznych', date: '1991-07-26', desc: 'Opodatkowanie dochodów osób fizycznych.', isap: 'WDU19910800350' },
    { title: 'CIT – podatek dochodowy od osób prawnych', date: '1992-02-15', desc: 'Opodatkowanie dochodów osób prawnych.', isap: 'WDU19920210086' },
    { title: 'VAT – podatek od towarów i usług', date: '2004-03-11', desc: 'Podatek od towarów i usług.', isap: 'WDU20040540535' },
    { title: 'Ustawa o NBP', date: '1997-08-29', desc: 'Funkcjonowanie Narodowego Banku Polskiego.', isap: 'WDU19970140672' },
    { title: 'Nadzór nad rynkiem finansowym', date: '2006-07-21', desc: 'Nadzór nad rynkiem finansowym i KNF.', isap: 'WDU20060157239' },
    { title: 'Obrót instrumentami finansowymi', date: '2005-07-29', desc: 'Reguluje obrót instrumentami finansowymi.', isap: 'WDU20050183143' },
    { title: 'Fundusze inwestycyjne', date: '2004-05-27', desc: 'Zasady tworzenia i funkcjonowania funduszy.', isap: 'WDU20040146154' },
    { title: 'Ochrona konkurencji i konsumentów', date: '2007-02-16', desc: 'Ochrona konkurencji i konsumentów.', isap: 'WDU20070134001' },
    { title: 'Przeciwdziałanie nieuczciwym praktykom rynkowym', date: '2007-08-23', desc: 'Ochrona przed nieuczciwymi praktykami rynkowymi.', isap: 'WDU20071070760' },
    { title: 'Prawo budowlane', date: '1994-07-07', desc: 'Normuje proces budowlany i wymogi techniczne.', isap: 'WDU19940890414' },
    { title: 'Planowanie i zagospodarowanie przestrzenne', date: '2003-03-27', desc: 'Zasady gospodarki przestrzennej.', isap: 'WDU20030180171' },
    { title: 'Prawo ochrony środowiska', date: '2001-04-27', desc: 'Ochrona środowiska naturalnego.', isap: 'WDU20010620627' },
    { title: 'Gospodarka nieruchomościami', date: '1997-08-21', desc: 'Gospodarowanie nieruchomościami.', isap: 'WDU19971150741' },
    { title: 'Prawo o adwokaturze', date: '1982-05-26', desc: 'Ustrój i funkcjonowanie adwokatury.', isap: 'WDU19820160124' },
    { title: 'Ustawa o radcach prawnych', date: '1982-07-06', desc: 'Ustrój i funkcjonowanie radców prawnych.', isap: 'WDU19820190145' },
    { title: 'Prawo o notariacie', date: '1991-02-14', desc: 'Organizacja notariatu i czynności notarialne.', isap: 'WDU19910220091' },
    { title: 'Ustawa o komornikach sądowych', date: '1997-08-29', desc: 'Funkcjonowanie komorników sądowych.', isap: 'WDU19971330882' },
    { title: 'Konstytucja Rzeczypospolitej Polskiej', date: '1997-04-02', desc: 'Najwyższy akt prawny w państwie.', isap: 'WDU19970780483' },
    { title: 'Odpowiedzialność podmiotów zbiorowych', date: '2002-10-28', desc: 'Odpowiedzialność karna firm i instytucji.', isap: 'WDU20020197148' },
    { title: 'System ubezpieczeń społecznych', date: '1998-10-13', desc: 'Zasady systemu ubezpieczeń społecznych.', isap: 'WDU19980137015' },
    { title: 'Kodeks Rodzinny i Opiekuńczy', date: '1964-02-25', desc: 'Małżeństwo, władza rodzicielska, opieka.', isap: 'WDU19640090059' },
    { title: 'Ustawa o prokuraturze', date: '2016-01-28', desc: 'Ustrój i funkcjonowanie prokuratury.', isap: 'WDU20160000177' },
    { title: 'Krajowa Rada Sądownictwa', date: '2011-05-12', desc: 'Funkcjonowanie Krajowej Rady Sądownictwa.', isap: 'WDU20110126067' },
    { title: 'Ustawa o SN (dawna)', date: '2002-07-23', desc: 'Organizacja Sądu Najwyższego (wersja archiwalna).', isap: 'WDU20020240180' },
    { title: 'Prawo dewizowe', date: '2002-07-18', desc: 'Obrót dewizowy i walutowy.', isap: 'WDU20020141551' },
    { title: 'Ustawa o KNF', date: '2016-02-05', desc: 'Nadzór nad rynkiem finansowym.', isap: 'WDU20160000356' },
    { title: 'Ustawa o obligacjach', date: '2015-01-15', desc: 'Emisja i obrót obligacjami.', isap: 'WDU20150000239' },
    { title: 'Prawo restrukturyzacyjne', date: '2016-04-15', desc: 'Postępowania restrukturyzacyjne.', isap: 'WDU20160001571' },
    { title: 'Ustawa o biegłych rewidentach', date: '2017-05-11', desc: 'Funkcjonowanie biegłych rewidentów.', isap: 'WDU20170001089' },
    { title: 'Ustawa o przeciwdziałaniu praniu pieniędzy', date: '2018-03-01', desc: 'Przeciwdziałanie praniu pieniędzy i finansowaniu terroryzmu.', isap: 'WDU20180000723' }
];
        var PRL_CODES = [
    { title: 'Kodeks Cywilny', date: '1964-04-23', desc: 'Fundamentalny akt regulujący stosunki cywilnoprawne.', isap: 'WDU19640160093' },
    { title: 'Kodeks Postępowania Cywilnego', date: '1964-11-17', desc: 'Procedura cywilna w PRL.', isap: 'WDU19640430296' },
    { title: 'Kodeks Rodzinny i Opiekuńczy', date: '1964-02-25', desc: 'Prawo rodzinne i opiekuńcze.', isap: 'WDU19640090059' },
    { title: 'Kodeks Pracy', date: '1974-06-26', desc: 'Prawo pracy w PRL.', isap: 'WDU19740240141' },
    { title: 'Kodeks postępowania administracyjnego', date: '1960-06-14', desc: 'Postępowanie przed administracją.', isap: 'WDU19600300168' },
    { title: 'Kodeks morski', date: '1961-12-01', desc: 'Żegluga morska i transport morski.', isap: 'WDU19610580281' },
    { title: 'Kodeks Wykroczeń', date: '1971-05-20', desc: 'Wykroczenia i kary.', isap: 'WDU19710220114' },
    { title: 'Kodeks Karny (1969)', date: '1969-04-19', desc: 'Drugi polski kodeks karny, zastąpił kodeks Makarewicza.', isap: 'WDU19690130094' },
    { title: 'Kodeks Postępowania Karnego (1969)', date: '1969-04-19', desc: 'Procedura karna w PRL.', isap: 'WDU19690130096' },
    { title: 'Kodeks Karny (1932) – Makarewicza', date: '1932-07-11', desc: 'Pierwszy nowoczesny KK, obowiązywał do 1969.', isap: 'WDU19320600571' },
    { title: 'Kodeks zobowiązań (1933)', date: '1933-10-27', desc: 'Regulował zobowiązania umowne i deliktowe.', isap: 'WDU19330820600' },
    { title: 'Prawo o ustroju sądów powszechnych (1928)', date: '1928-02-06', desc: 'Organizacja sądownictwa w II RP i PRL.', isap: 'WDU19280120093' },
    { title: 'Dekret o ustroju sądów (PRL)', date: '1945-09-14', desc: 'Powojenny ustrój sądów.', isap: 'WDU19450040030' },
    { title: 'Dekret o prawie małżeńskim', date: '1945-09-25', desc: 'Prawo małżeńskie w pierwszych latach PRL.', isap: 'WDU19450040005' },
    { title: 'Dekret o prawie rzeczowym', date: '1946-10-11', desc: 'Prawo rzeczowe przed kodeksem cywilnym.', isap: 'WDU19460060047' },
    { title: 'Dekret o postępowaniu nakazowym', date: '1945-11-16', desc: 'Postępowanie nakazowe w PRL.', isap: 'WDU19450050030' },
    { title: 'Dekret o postępowaniu upadłościowym', date: '1947-11-07', desc: 'Postępowanie upadłościowe w PRL.', isap: 'WDU19470070041' },
    { title: 'Ustawa o nacjonalizacji przemysłu', date: '1946-01-03', desc: 'Nacjonalizacja przemysłu w PRL.', isap: 'WDU19460040017' },
    { title: 'Dekret o reformie rolnej', date: '1944-09-06', desc: 'Reforma rolna w Polsce Ludowej.', isap: 'WDU19440040015' },
    { title: 'Ustawa o planowej gospodarce', date: '1947-05-17', desc: 'Planowanie gospodarcze w PRL.', isap: 'WDU19470050040' },
    { title: 'Ustawa o sądach wojewódzkich', date: '1950-07-15', desc: 'Reforma sądownictwa terenowego.', isap: 'WDU19500340250' },
    { title: 'Kodeks Karny (1932) – dalej obowiązywał', date: '1932-07-11', desc: 'KK Makarewicza obowiązywał do 1969 r.', isap: 'WDU19320600571' },
    { title: 'Kodeks Postępowania Karnego (1928)', date: '1928-03-19', desc: 'KPK II RP, obowiązywał do 1969 r.', isap: 'WDU19280330313' },
    { title: 'Ustawa o Prokuraturze PRL', date: '1954-07-20', desc: 'Organizacja prokuratury w PRL.', isap: 'WDU19540040050' },
    { title: 'Ustawa o Najwyższej Izbie Kontroli', date: '1957-11-29', desc: 'NIK w PRL.', isap: 'WDU19570060080' },
    { title: 'Ustawa o radach narodowych', date: '1958-01-25', desc: 'Ustrój rad narodowych.', isap: 'WDU19580050020' },
    { title: 'Ustawa o terenowych organach administracji', date: '1973-11-22', desc: 'Administracja terenowa w PRL.', isap: 'WDU19730050030' },
    { title: 'Ustawa o przedsiębiorstwach państwowych', date: '1981-09-25', desc: 'Funkcjonowanie przedsiębiorstw państwowych.', isap: 'WDU19810240130' },
    { title: 'Ustawa o samorządzie załogi', date: '1981-09-25', desc: 'Samorządność w przedsiębiorstwach.', isap: 'WDU19810240120' },
    { title: 'Ustawa o gospodarce gruntami', date: '1982-02-26', desc: 'Gospodarka gruntami w PRL.', isap: 'WDU19820070050' },
    { title: 'Ustawa o szkolnictwie wyższym', date: '1982-05-04', desc: 'Organizacja szkolnictwa wyższego w PRL.', isap: 'WDU19820140060' },
    { title: 'Ustawa o Narodowym Banku Polskim (PRL)', date: '1982-02-26', desc: 'Funkcjonowanie NBP w PRL.', isap: 'WDU19820070010' },
    { title: 'Ustawa o działalności gospodarczej', date: '1988-12-23', desc: 'Ustawa Wilczka – przełomowa deregulacja.', isap: 'WDU19880410050' },
    { title: 'Ustawa o samorządzie terytorialnym', date: '1990-03-08', desc: 'Samorząd terytorialny (pierwsza po PRL).', isap: 'WDU19900160095' },
    { title: 'Kodeks Wykroczeń (1971)', date: '1971-05-20', desc: 'Kodeks wykroczeń.', isap: 'WDU19710220114' },
    { title: 'Ustawa o ubezpieczeniu społecznym', date: '1974-12-19', desc: 'Ubezpieczenie społeczne w PRL.', isap: 'WDU19750050010' },
    { title: 'Ustawa o zatrudnieniu', date: '1967-06-15', desc: 'Polityka zatrudnienia w PRL.', isap: 'WDU19670030040' },
    { title: 'Ustawa o Państwowej Inspekcji Pracy', date: '1967-06-15', desc: 'Nadzór nad warunkami pracy.', isap: 'WDU19670030030' },
    { title: 'Ustawa o ochronie dóbr kultury', date: '1962-02-15', desc: 'Ochrona dóbr kultury w PRL.', isap: 'WDU19620100050' },
    { title: 'Ustawa o lasach', date: '1956-05-31', desc: 'Gospodarka leśna w PRL.', isap: 'WDU19560180010' },
    { title: 'Ustawa o pilnujących gospodarki', date: '1959-06-15', desc: 'Ochrona gospodarki PRL.', isap: 'WDU19590040070' },
    { title: 'Ustawa o adwokaturze (PRL)', date: '1963-12-19', desc: 'Adwokatura w PRL.', isap: 'WDU19630080025' },
    { title: 'Ustawa o łączności', date: '1973-11-15', desc: 'Poczta i telekomunikacja w PRL.', isap: 'WDU19730040070' },
    { title: 'Ustawa o wynalazczości', date: '1972-10-19', desc: 'Prawo wynalazcze w PRL.', isap: 'WDU19720010040' },
    { title: 'Ustawa o ochronie wynalazków', date: '1962-05-31', desc: 'Ochrona własności przemysłowej w PRL.', isap: 'WDU19620040035' },
    { title: 'Ustawa o geodezji', date: '1968-06-28', desc: 'Geodezja w PRL.', isap: 'WDU19680030015' },
    { title: 'Ustawa o budownictwie', date: '1961-01-31', desc: 'Prawo budowlane w PRL.', isap: 'WDU19610020005' },
    { title: 'Ustawa o ochronie przyrody', date: '1949-03-07', desc: 'Ochrona przyrody w PRL.', isap: 'WDU19490050075' },
    { title: 'Dekret o umorzeniu należności', date: '1950-04-15', desc: 'Umorzenia podatkowe PRL.', isap: 'WDU19500020040' },
    { title: 'Dekret o odpowiedzialności karnej', date: '1946-06-13', desc: 'Odpowiedzialność za przestępstwa gospodarcze PRL.', isap: 'WDU19460030020' }
];
        var II_RP_CODES = [
    { title: 'Kodeks Handlowy', date: '1934-06-27', desc: 'Regulacja obrotu handlowego, prawa wekslowego i czekowego.', isap: 'WDU19340570502' },
    { title: 'Kodeks Zobowiązań', date: '1933-10-27', desc: 'Zobowiązania umowne i deliktowe II RP.', isap: 'WDU19330820600' },
    { title: 'Kodeks Postępowania Cywilnego', date: '1930-11-29', desc: 'Procedura cywilna w II RP.', isap: 'WDU19300830651' },
    { title: 'Kodeks Karny (Makarewicza)', date: '1932-07-11', desc: 'Pierwszy nowoczesny kodeks karny.', isap: 'WDU19320600571' },
    { title: 'Prawo upadłościowe', date: '1934-10-24', desc: 'Postępowanie upadłościowe w II RP.', isap: 'WDU19340930863' },
    { title: 'Prawo wekslowe', date: '1924-04-28', desc: 'Obrót wekslami i czekami.', isap: 'WDU19240100155' },
    { title: 'Kodeks Postępowania Karnego', date: '1928-03-19', desc: 'Procedura karna II RP.', isap: 'WDU19280330313' },
    { title: 'Prawo o ustroju sądów powszechnych', date: '1928-02-06', desc: 'Organizacja sądownictwa II RP.', isap: 'WDU19280120093' },
    { title: 'Zwalczanie nieuczciwej konkurencji', date: '1926-07-14', desc: 'Pierwsza polska ustawa antymonopolowa.', isap: 'WDU19260940702' },
    { title: 'Konstytucja Marcowa', date: '1921-03-17', desc: 'Ustawa zasadnicza II RP (1921–1935).', isap: 'WDU19210260267' },
    { title: 'Konstytucja Kwietniowa', date: '1935-04-23', desc: 'Ustawa zasadnicza II RP (1935–1939).', isap: 'WDU19350300301' },
    { title: 'Mała Konstytucja', date: '1919-02-20', desc: 'Tymczasowa ustawa zasadnicza (1919–1921).', isap: 'WDU19190150006' },
    { title: 'Ordynacja wyborcza do Sejmu', date: '1922-07-31', desc: 'Ordynacja wyborcza II RP.', isap: 'WDU19220830728' },
    { title: 'Ustawa o spółkach akcyjnych', date: '1928-03-22', desc: 'Regulacja spółek akcyjnych w II RP.', isap: 'WDU19280350353' },
    { title: 'Ustawa o spółkach z ograniczoną odpowiedzialnością', date: '1928-03-22', desc: 'Regulacja sp. z o.o. w II RP.', isap: 'WDU19280350354' },
    { title: 'Prawo o notariacie', date: '1933-10-27', desc: 'Notariat w II RP.', isap: 'WDU19330820680' },
    { title: 'Ustawa o prokuraturze', date: '1928-06-06', desc: 'Prokuratura w II RP.', isap: 'WDU19280520632' },
    { title: 'Ustawa o Sądzie Najwyższym', date: '1928-02-06', desc: 'Sąd Najwyższy w II RP.', isap: 'WDU19280120095' },
    { title: 'Ustawa o Najwyższym Trybunale Administracyjnym', date: '1922-08-03', desc: 'Pierwszy sąd administracyjny w Polsce.', isap: 'WDU19220700660' },
    { title: 'Ustawa o zbieraniu podpisów', date: '1927-07-15', desc: 'Kodeks wyborczy II RP.', isap: 'WDU19270140120' },
    { title: 'Prawo o stowarzyszeniach', date: '1932-10-27', desc: 'Zakładanie i działalność stowarzyszeń.', isap: 'WDU19320940808' },
    { title: 'Prawo o zgromadzeniach', date: '1932-10-27', desc: 'Organizacja zgromadzeń publicznych.', isap: 'WDU19320940810' },
    { title: 'Ustawa prasowa', date: '1927-11-21', desc: 'Prawo prasowe w II RP.', isap: 'WDU19270120150' },
    { title: 'Ustawa o ochronie lokatorów', date: '1924-11-20', desc: 'Ochrona praw lokatorów w II RP.', isap: 'WDU19240110015' },
    { title: 'Ustawa o zwalczaniu lichwy', date: '1928-07-24', desc: 'Ochrona przed lichwą w II RP.', isap: 'WDU19280800630' },
    { title: 'Ustawa o kasach oszczędności', date: '1924-02-15', desc: 'Działalność kas oszczędności w II RP.', isap: 'WDU19240120035' },
    { title: 'Ustawa o uprawnieniach dla byłych wojskowych', date: '1921-04-23', desc: 'Uprawnienia dla byłych żołnierzy.', isap: 'WDU19210390310' },
    { title: 'Prawo o bankach', date: '1924-12-15', desc: 'Bankowość w II RP.', isap: 'WDU19240110025' },
    { title: 'Ustawa o Banku Polskim', date: '1924-12-15', desc: 'Bank emisyjny II RP.', isap: 'WDU19240110030' },
    { title: 'Ustawa o giełdach', date: '1921-05-20', desc: 'Giełdy w II RP.', isap: 'WDU19210450250' },
    { title: 'Prawo o miarach', date: '1924-05-28', desc: 'System miar i wag w II RP.', isap: 'WDU19240400280' },
    { title: 'Ustawa o ochronie wynalazków', date: '1924-02-22', desc: 'Patent i ochrona wynalazków.', isap: 'WDU19240200501' },
    { title: 'Ustawa o znakach towarowych', date: '1924-02-22', desc: 'Ochrona znaków towarowych.', isap: 'WDU19240200502' },
    { title: 'Ustawa o prawie autorskim', date: '1926-03-29', desc: 'Ochrona praw autorskich w II RP.', isap: 'WDU19260360130' },
    { title: 'Ustawa o podatku dochodowym', date: '1925-07-16', desc: 'Opodatkowanie dochodów w II RP.', isap: 'WDU19250920070' },
    { title: 'Ustawa o podatku przemysłowym', date: '1925-07-16', desc: 'Opodatkowanie przemysłu.', isap: 'WDU19250920072' },
    { title: 'Ustawa o podatku od spadków', date: '1925-07-16', desc: 'Podatek od spadków w II RP.', isap: 'WDU19250920080' },
    { title: 'Ustawa o opłatach stemplowych', date: '1928-01-20', desc: 'Opłaty stemplowe w II RP.', isap: 'WDU19280100110' },
    { title: 'Prawo o aktach stanu cywilnego', date: '1928-05-29', desc: 'Rejestracja stanu cywilnego w II RP.', isap: 'WDU19280520520' },
    { title: 'Ustawa o obywatelstwie polskim', date: '1922-07-20', desc: 'Zasady nabywania obywatelstwa.', isap: 'WDU19220830620' },
    { title: 'Ustawa o cudzoziemcach', date: '1927-04-22', desc: 'Pobyt cudzoziemców w II RP.', isap: 'WDU19270400380' },
    { title: 'Ustawa o poświadczaniu dokumentów', date: '1924-06-15', desc: 'Legalizacja dokumentów w II RP.', isap: 'WDU19240450220' },
    { title: 'Ustawa o kontraktach rządowych', date: '1928-03-15', desc: 'Zamówienia rządowe w II RP.', isap: 'WDU19280300230' },
    { title: 'Ustawa o kredycie długoterminowym', date: '1925-06-18', desc: 'Kredyt długoterminowy w II RP.', isap: 'WDU19250650045' },
    { title: 'Ustawa o regulacji rzek', date: '1922-05-25', desc: 'Gospodarka wodna w II RP.', isap: 'WDU19220400160' },
    { title: 'Prawo o adopcji', date: '1928-07-12', desc: 'Przysposobienie w II RP.', isap: 'WDU19280800570' },
    { title: 'Ustawa o opiece społecznej', date: '1923-08-16', desc: 'Opieka społeczna w II RP.', isap: 'WDU19230920015' },
    { title: 'Ustawa o sądach pracy', date: '1928-07-27', desc: 'Sądy pracy w II RP.', isap: 'WDU19280800640' },
    { title: 'Ustawa o izbach handlowych', date: '1927-12-15', desc: 'Izby handlowe i przemysłowe w II RP.', isap: 'WDU19270120180' },
    { title: 'Ustawa o zwalczaniu chorób zakaźnych', date: '1919-07-01', desc: 'Ochrona zdrowia w II RP.', isap: 'WDU19190650005' }
];

        function renderLegalCodes() {
            var container = document.getElementById('zrodla-main-container');
            if (!container) return;

            var html = '<div class="section-head"><h2>Podstawy Prawne</h2><div class="section-head-line"></div></div>';
            html += '<p class="section-desc">Platforma symulacyjna <strong>Materia Dowodowa</strong> opiera się na polskim porządku prawnym w trzech ujęciach historycznych. Poniżej znajdują się akty prawne wykorzystywane w symulacji wraz z bezpośrednimi odnośnikami do Internetowego Systemu Akt&oacute;w Prawnych (ISAP) Rządowego Centrum Legislacji.</p>';
            html += '<div class="info-card" style="margin-bottom:24px;padding:20px 24px;border-left:3px solid var(--accent);">';
            html += '<p style="margin:0;font-size:0.95rem;"><strong>Uwaga:</strong> Akty prawne z okresu PRL i II Rzeczypospolitej mają charakter archiwalny i nie wszystkie mogą być dostępne w cyfrowym repozytorium ISAP. Linki prowadzą do odpowiednich wpis&oacute;w w systemie &mdash; jeśli dokument nie jest dostępny online, oznacza to, że nie został jeszcze zdigitalizowany przez RCL.</p>';
            html += '</div>';

            // Search bar
            html += '<div class="search-bar">';
            html += '<svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6"/><line x1="13" y1="13" x2="18" y2="18"/></svg>';
            html += '<input type="text" id="legalSearch" class="search-input" placeholder="Szukaj w aktach prawnych..." autocomplete="off">';
            html += '</div>';
            html += '<div id="legalCodesCount" style="font-size:0.9rem;color:var(--text-muted);margin-bottom:20px;"></div>';

            var eras = [
                { id: 'wspolczesne', name: 'Wsp&oacute;łczesne (po 1989 r.)', codes: WSPOLCZESNE, archival: false },
                { id: 'prl', name: 'PRL (1944&ndash;1989)', codes: PRL_CODES, archival: true },
                { id: 'ii_rp', name: 'II Rzeczpospolita (1918&ndash;1939)', codes: II_RP_CODES, archival: true }
            ];

            var allCodes = [];
            eras.forEach(function(era) {
                era.codes.forEach(function(c) {
                    c._era = era.name;
                    c._archival = era.archival;
                    allCodes.push(c);
                });
            });

            function renderFilteredCodes(filter) {
                var outputHtml = '';
                var filterLower = filter ? filter.toLowerCase() : '';

                var filtered = allCodes.filter(function(c) {
                    if (!filterLower) return true;
                    return c.title.toLowerCase().indexOf(filterLower) !== -1 ||
                           c.desc.toLowerCase().indexOf(filterLower) !== -1 ||
                           c.date.indexOf(filterLower) !== -1 ||
                           c._era.toLowerCase().indexOf(filterLower) !== -1;
                });

                // Group by era
                var grouped = {};
                filtered.forEach(function(c) {
                    var key = c._era;
                    if (!grouped[key]) grouped[key] = { name: key, codes: [], archival: c._archival };
                    grouped[key].codes.push(c);
                });

                var count = filtered.length;
                var countEl = document.getElementById('legalCodesCount');
                if (countEl) {
                    countEl.textContent = filterLower ? 'Znaleziono ' + count + ' z ' + allCodes.length + ' akt&oacute;w prawnych' : 'Łącznie ' + allCodes.length + ' akt&oacute;w prawnych';
                }

                var eraOrder = ['Wsp&oacute;łczesne (po 1989 r.)', 'PRL (1944&ndash;1989)', 'II Rzeczpospolita (1918&ndash;1939)'];
                eraOrder.forEach(function(eraName) {
                    var group = grouped[eraName];
                    if (!group || group.codes.length === 0) return;

                    outputHtml += '<div class="section-head" style="margin-top:30px;">';
                    outputHtml += '<h2 style="font-size:1.4rem;">' + group.name + ' <span style="font-size:0.85rem;color:var(--text-muted);font-weight:400;">(' + group.codes.length + ')</span></h2>';
                    outputHtml += '<div class="section-head-line"></div></div>';
                    outputHtml += '<div class="cards-grid">';

                    group.codes.forEach(function(c) {
                        var isArchival = group.archival;
                        outputHtml += '<div class="card" style="' + (isArchival ? 'opacity:0.85;' : '') + '">';
                        outputHtml += '<h3>' + c.title + '</h3>';
                        outputHtml += '<p><em>' + c.date + '</em> &mdash; ' + c.desc + '</p>';
                        if (isArchival) {
                            outputHtml += '<p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">&#x1F4DC; Akt archiwalny</p>';
                        }
                        outputHtml += '<a href="https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=' + c.isap + '" target="_blank" class="btn-action" rel="noopener noreferrer" style="margin-top:auto;">';
                        outputHtml += '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
                        outputHtml += ' Otwórz w ISAP</a></div>';
                    });

                    outputHtml += '</div>';
                });

                if (filtered.length === 0) {
                    outputHtml = '<div class="empty-state" style="margin-top:20px;"><div class="empty-state-title">Brak wynik&oacute;w</div><p>Nie znaleziono akt&oacute;w prawnych pasujących do zapytania <strong>"' + escapeHtml(filterLower) + '"</strong>. Spr&oacute;buj innych sł&oacute;w kluczowych.</p></div>';
                }

                return outputHtml;
            }

            container.innerHTML = html;
            // Wrap initial results in a container for easy replacement by search
            var initialWrapper = document.createElement('div');
            initialWrapper.id = 'legal-codes-results';
            initialWrapper.innerHTML = renderFilteredCodes('');
            container.appendChild(initialWrapper);

            // Live search
            var searchInput = document.getElementById('legalSearch');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    var resultsHtml = renderFilteredCodes(this.value);
                    var resultsWrapper = document.getElementById('legal-codes-results');
                    if (resultsWrapper) {
                        resultsWrapper.innerHTML = resultsHtml;
                    }
                });
            }
        }

        // Render on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderLegalCodes);
        } else {
            renderLegalCodes();
        }


        // ============================================
        // FORUM
        // ============================================
        // Forum uses GitHub API — data stored as forum/topics.json in the repo
        // ============================================
        (function() {
            var topics = [];
            var isLoading = true;

            function escapeHtml(text) {
                var div = document.createElement('div');
                div.appendChild(document.createTextNode(text));
                return div.innerHTML;
            }

            function saveTopics(callback) {
                // Lokalny backup do localStorage
                if (typeof callback !== 'function') callback = function(){};
                try {
                    localStorage.setItem('md_forum_topics', JSON.stringify(topics));
                } catch(e) {}
                // Główne operacje CRUD idą przez GitHubAPI.postAction()
                // Ta funkcja służy tylko jako lokalna kopia zapasowa
                if (typeof callback === 'function') callback(null);
            }

            function refreshTopics(callback) {
                if (typeof callback !== 'function') callback = function(){};
                if (typeof GitHubAPI !== 'undefined') {
                    GitHubAPI.readTopics(function(err, data) {
                        if (!err && data && Array.isArray(data)) {
                            topics = data;
                        }
                        callback(err);
                    });
                } else {
                    callback(null);
                }
            }

            function renderTopics() {
                var list = document.getElementById('forumTopicsList');
                if (!list) return;

                if (isLoading) {
                    list.innerHTML = '<div class="empty-state"><div class="empty-state-title">&#x231B; Ładowanie forum...</div><p>Pobieranie tematów z repozytorium...</p></div>';
                    return;
                }

                if (topics.length === 0) {
                    list.innerHTML = '<div class="empty-state" id="forum-empty-msg"><div class="empty-state-title">Brak tematów na forum</div><p>Bądź pierwszy! Zadaj pytanie lub podziel się swoimi przemyśleniami na temat symulacji.</p></div>';
                    return;
                }

                var html = '';
                topics.forEach(function(topic, idx) {
                    var date = new Date(topic.createdAt);
                    var dateStr = date.toLocaleDateString('pl-PL') + ' ' + date.toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit'});
                    var replyCount = (topic.replies || []).length;

                    html += '<div class="card" style="cursor:pointer;" data-forum-topic="' + idx + '">';
                    html += '<div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;">';
                    html += '<div style="flex:1;min-width:0;">';
                    html += '<h3 style="margin-bottom:6px;">' + escapeHtml(topic.title) + '</h3>';
                    html += '<p style="margin-bottom:8px;">' + escapeHtml(topic.content) + '</p>';
                    html += '<p style="font-size:0.85rem;color:var(--text-muted);">' + dateStr + ' &bull; ' + replyCount + ' odpowiedzi</p>';
                    html += '</div>';
                    html += '<div style="flex-shrink:0;display:flex;gap:6px;align-items:center;">';
                    if (replyCount > 0) {
                        html += '<span style="font-size:0.75rem;padding:2px 10px;border-radius:12px;background:var(--accent-soft);color:var(--accent);font-weight:600;">' + replyCount + '</span>';
                    }
                    html += '</div></div></div>';
                });

                list.innerHTML = '<div id="forum-topics-grid" class="cards-grid">' + html + '</div>';

                // Add click handlers to open topic detail
                list.querySelectorAll('[data-forum-topic]').forEach(function(el) {
                    el.addEventListener('click', function(e) {
                        if (e.target.closest('.forum-del-topic')) return;
                        var idx = parseInt(this.getAttribute('data-forum-topic'));
                        showTopicDetail(idx);
                    });
                });
            }

            function showTopicDetail(idx) {
                var topic = topics[idx];
                if (!topic) return;

                var list = document.getElementById('forumTopicsList');
                var date = new Date(topic.createdAt);
                var dateStr = date.toLocaleDateString('pl-PL') + ' ' + date.toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit'});
                var replies = topic.replies || [];

                var html = '<div style="margin-bottom:20px;">';
                html += '<button class="btn-action" id="forumBackBtn" type="button" style="background:transparent;border-color:var(--text-muted);color:var(--text-muted);font-size:0.9rem;padding:8px 18px;">';
                html += '&larr; Powrót do listy</button></div>';

                // Topic card with edit/delete buttons
                html += '<div class="card" style="margin-bottom:24px;">';
                html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">';
                html += '<div style="flex:1;min-width:0;">';
                html += '<h3 id="forumTopicTitleDisplay">' + escapeHtml(topic.title) + '</h3>';
                html += '<p id="forumTopicContentDisplay">' + escapeHtml(topic.content) + '</p>';
                html += '<p style="font-size:0.85rem;color:var(--text-muted);margin-top:10px;">' + dateStr + '</p>';
                html += '</div>';
                html += '<div style="flex-shrink:0;display:flex;gap:6px;">';
                html += '<button class="forum-edit-topic" data-idx="' + idx + '" title="Edytuj temat" style="background:none;border:1px solid var(--border);color:var(--accent);cursor:pointer;padding:4px 10px;font-size:0.85rem;border-radius:6px;transition:var(--t-fast);">&#x270E; Edytuj</button>';
                html += '<button class="forum-del-topic-detail" data-idx="' + idx + '" title="Usuń temat" style="background:none;border:1px solid var(--danger);color:var(--danger);cursor:pointer;padding:4px 10px;font-size:0.85rem;border-radius:6px;transition:var(--t-fast);">&#x2716; Usuń</button>';
                html += '</div></div>';

                // Inline edit form for topic (hidden by default)
                html += '<div id="forumEditTopicForm" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);animation:fadeUp 0.3s ease;">';
                html += '<div class="form-group">';
                html += '<label for="forumEditTopicTitle">Tytuł</label>';
                html += '<input type="text" id="forumEditTopicTitle" value="' + escapeHtml(topic.title) + '" style="margin-bottom:10px;">';
                html += '</div>';
                html += '<div class="form-group">';
                html += '<label for="forumEditTopicContent">Treść</label>';
                html += '<textarea id="forumEditTopicContent" rows="4">' + escapeHtml(topic.content) + '</textarea>';
                html += '</div>';
                html += '<div style="display:flex;gap:10px;margin-top:12px;">';
                html += '<button class="btn-action forum-save-topic-edit" data-idx="' + idx + '" type="button" style="font-size:0.9rem;padding:8px 20px;">Zapisz</button>';
                html += '<button class="btn-action forum-cancel-topic-edit" type="button" style="background:transparent;border-color:var(--text-muted);color:var(--text-muted);font-size:0.9rem;padding:8px 20px;">Anuluj</button>';
                html += '</div></div>';

                html += '</div>';

                html += '<h4 style="color:var(--accent);margin-bottom:16px;font-family:\'Open Sans\';font-weight:600;">Odpowiedzi (' + replies.length + ')</h4>';

                if (replies.length === 0) {
                    html += '<div class="empty-state" style="padding:30px;margin-bottom:20px;"><p style="margin:0;">Brak odpowiedzi. Bądź pierwszy!</p></div>';
                } else {
                    replies.forEach(function(reply, rIdx) {
                        var replyDate = new Date(reply.createdAt);
                        var replyDateStr = replyDate.toLocaleDateString('pl-PL') + ' ' + replyDate.toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit'});
                        html += '<div class="forum-reply-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);padding:20px;margin-bottom:12px;">';
                        html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">';
                        html += '<div style="flex:1;min-width:0;">';
                        html += '<p class="forum-reply-content" data-rcontent="' + escapeHtml(reply.content) + '">' + escapeHtml(reply.content) + '</p>';
                        html += '<p style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;">' + replyDateStr + '</p>';
                        html += '</div>';
                        html += '<div style="flex-shrink:0;display:flex;gap:4px;">';
                        html += '<button class="forum-edit-reply" data-topic-idx="' + idx + '" data-reply-idx="' + rIdx + '" title="Edytuj odpowiedź" style="background:none;border:none;color:var(--accent);cursor:pointer;padding:2px 6px;font-size:0.85rem;border-radius:4px;transition:var(--t-fast);">&#x270E;</button>';
                        html += '<button class="forum-del-reply" data-topic-idx="' + idx + '" data-reply-idx="' + rIdx + '" title="Usuń odpowiedź" style="background:none;border:none;color:var(--danger);cursor:pointer;padding:2px 6px;font-size:0.85rem;border-radius:4px;transition:var(--t-fast);">&#x2716;</button>';
                        html += '</div></div>';

                        // Inline edit form for reply (hidden by default)
                        html += '<div class="forum-edit-reply-form" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);animation:fadeUp 0.3s ease;">';
                        html += '<textarea class="forum-edit-reply-input" rows="2" style="width:100%;padding:10px 14px;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:var(--rs);font-family:inherit;font-size:0.95rem;resize:vertical;">' + escapeHtml(reply.content) + '</textarea>';
                        html += '<div style="display:flex;gap:8px;margin-top:8px;">';
                        html += '<button class="btn-action forum-save-reply-edit" data-topic-idx="' + idx + '" data-reply-idx="' + rIdx + '" type="button" style="font-size:0.85rem;padding:6px 16px;">Zapisz</button>';
                        html += '<button class="btn-action forum-cancel-reply-edit" type="button" style="background:transparent;border-color:var(--text-muted);color:var(--text-muted);font-size:0.85rem;padding:6px 16px;">Anuluj</button>';
                        html += '</div></div>';

                        html += '</div>';
                    });
                }

                html += '<div style="margin-top:20px;">';
                html += '<textarea id="forumReplyInput" rows="3" placeholder="Napisz odpowiedź..." style="width:100%;padding:14px 18px;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:var(--rs);font-family:inherit;font-size:1rem;resize:vertical;"></textarea>';
                html += '<div style="display:flex;gap:12px;margin-top:12px;">';
                html += '<button class="btn-action" id="forumReplyBtn" type="button" data-topic-idx="' + idx + '">Odpowiedz</button>';
                html += '</div></div>';

                list.innerHTML = html;

                // Back button handler
                document.getElementById('forumBackBtn').addEventListener('click', function() {
                    renderTopics();
                });

                // Reply button handler — przez Vercel API
                document.getElementById('forumReplyBtn').addEventListener('click', function() {
                    var input = document.getElementById('forumReplyInput');
                    var content = input.value.trim();
                    if (!content) {
                        showToast('Treść odpowiedzi nie może być pusta.', 'error', 3000);
                        return;
                    }
                    var tIdx = parseInt(this.getAttribute('data-topic-idx'));
                    if (!topics[tIdx]) return;

                    // Optymistycznie dodaj lokalnie
                    if (!topics[tIdx].replies) topics[tIdx].replies = [];
                    topics[tIdx].replies.push({
                        content: content,
                        createdAt: new Date().toISOString()
                    });
                    saveTopics();
                    showTopicDetail(tIdx);

                    // Wyślij do API
                    if (typeof GitHubAPI !== 'undefined') {
                        GitHubAPI.postAction('reply', {
                            topicIdx: tIdx,
                            content: content
                        }, function(err) {
                            if (err) {
                                showToast('Odpowiedź dodana lokalnie. Błąd synchronizacji: ' + err, 'info', 5000);
                            } else {
                                showToast('Dodano odpowiedź!', 'success', 3000);
                                // Odśwież dane
                                refreshTopics(function() {
                                    showTopicDetail(tIdx);
                                });
                            }
                        });
                    } else {
                        showToast('Dodano odpowiedź! (tryb offline)', 'success', 3000);
                    }
                });

                // Edit topic button handler
                var editTopicBtns = list.querySelectorAll('.forum-edit-topic');
                editTopicBtns.forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var form = document.getElementById('forumEditTopicForm');
                        if (form) form.style.display = 'block';
                    });
                });

                // Cancel topic edit handler
                var cancelTopicBtns = list.querySelectorAll('.forum-cancel-topic-edit');
                cancelTopicBtns.forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var form = document.getElementById('forumEditTopicForm');
                        if (form) form.style.display = 'none';
                    });
                });

                // Save topic edit handler
                var saveTopicBtns = list.querySelectorAll('.forum-save-topic-edit');
                saveTopicBtns.forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var tIdx = parseInt(this.getAttribute('data-idx'));
                        var titleInput = document.getElementById('forumEditTopicTitle');
                        var contentInput = document.getElementById('forumEditTopicContent');
                        if (!titleInput || !contentInput) return;
                        var newTitle = titleInput.value.trim();
                        var newContent = contentInput.value.trim();
                        if (!newTitle || !newContent) {
                            showToast('Tytuł i treść nie mogą być puste.', 'error', 3000);
                            return;
                        }
                        if (topics[tIdx]) {
                            topics[tIdx].title = newTitle;
                            topics[tIdx].content = newContent;
                            topics[tIdx].modifiedAt = new Date().toISOString();
                            saveTopics();
                            showToast('Temat został zaktualizowany.', 'success', 3000);
                            showTopicDetail(tIdx);
                        }
                    });
                });

                // Delete topic handler (in detail view) — requires code
                var delTopicBtns = list.querySelectorAll('.forum-del-topic-detail');
                delTopicBtns.forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var tIdx = parseInt(this.getAttribute('data-idx'));
                        var topicId = topics[tIdx] ? topics[tIdx].id : null;
                        showDeleteCodeModal('temat', tIdx, null, function() {
                            var deleteCode = document.getElementById('deleteCodeInput').value.trim().toUpperCase();
                            // Lokalnie usuń
                            topics.splice(tIdx, 1);
                            // Usuń zapisany kod
                            if (topicId) removeSavedDeleteCode(topicId);
                            saveTopics();
                            renderTopics();
                            showToast('Usuwanie tematu...', 'info', 2000);
                            // Wyślij do API
                            if (typeof GitHubAPI !== 'undefined') {
                                GitHubAPI.postAction('delete', {
                                    topicIdx: tIdx,
                                    code: deleteCode
                                }, function(err) {
                                    if (err) {
                                        showToast('Temat usunięty lokalnie. Błąd synchronizacji: ' + err, 'info', 5000);
                                    } else {
                                        showToast('Temat został usunięty.', 'info', 3000);
                                        refreshTopics(function() {
                                            renderTopics();
                                        });
                                    }
                                });
                            } else {
                                showToast('Temat został usunięty lokalnie.', 'info', 3000);
                            }
                        });
                    });
                });

                // Edit reply button handler
                var editReplyBtns = list.querySelectorAll('.forum-edit-reply');
                editReplyBtns.forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var replyCard = this.closest('.forum-reply-card');
                        var editForm = replyCard.querySelector('.forum-edit-reply-form');
                        if (editForm) editForm.style.display = 'block';
                    });
                });

                // Cancel reply edit handler
                var cancelReplyBtns = list.querySelectorAll('.forum-cancel-reply-edit');
                cancelReplyBtns.forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var replyCard = this.closest('.forum-reply-card');
                        var editForm = replyCard.querySelector('.forum-edit-reply-form');
                        if (editForm) editForm.style.display = 'none';
                    });
                });

                // Save reply edit handler
                var saveReplyBtns = list.querySelectorAll('.forum-save-reply-edit');
                saveReplyBtns.forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var tIdx = parseInt(this.getAttribute('data-topic-idx'));
                        var rIdx = parseInt(this.getAttribute('data-reply-idx'));
                        var replyCard = this.closest('.forum-reply-card');
                        var input = replyCard.querySelector('.forum-edit-reply-input');
                        var newContent = input.value.trim();
                        if (!newContent) {
                            showToast('Treść odpowiedzi nie może być pusta.', 'error', 3000);
                            return;
                        }
                        if (topics[tIdx] && topics[tIdx].replies && topics[tIdx].replies[rIdx]) {
                            topics[tIdx].replies[rIdx].content = newContent;
                            // Preserve original creation date, update modified date
                            topics[tIdx].replies[rIdx].modifiedAt = new Date().toISOString();
                            saveTopics();
                            showToast('Odpowiedź została zaktualizowana.', 'success', 3000);
                            showTopicDetail(tIdx);
                        }
                    });
                });

                // Delete reply handler — requires code
                var delReplyBtns = list.querySelectorAll('.forum-del-reply');
                delReplyBtns.forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var tIdx = parseInt(this.getAttribute('data-topic-idx'));
                        var rIdx = parseInt(this.getAttribute('data-reply-idx'));
                        showDeleteCodeModal('odpowiedź', tIdx, rIdx, function() {
                            var deleteCode = document.getElementById('deleteCodeInput').value.trim().toUpperCase();
                            if (topics[tIdx] && topics[tIdx].replies) {
                                topics[tIdx].replies.splice(rIdx, 1);
                                saveTopics();
                                showTopicDetail(tIdx);
                                // Wyślij do API
                                if (typeof GitHubAPI !== 'undefined') {
                                    GitHubAPI.postAction('delete', {
                                        topicIdx: tIdx,
                                        replyIdx: rIdx,
                                        code: deleteCode
                                    }, function(err) {
                                        if (err) {
                                            showToast('Usunięto lokalnie. Błąd synchronizacji: ' + err, 'info', 5000);
                                        } else {
                                            showToast('Odpowiedź została usunięta.', 'info', 3000);
                                            refreshTopics(function() {
                                                showTopicDetail(tIdx);
                                            });
                                        }
                                    });
                                } else {
                                    showToast('Odpowiedź została usunięta lokalnie.', 'info', 3000);
                                }
                            }
                        });
                    });
                });
            }

            // Init forum — load from GitHub API
            if (typeof GitHubAPI !== 'undefined') {
                GitHubAPI.readTopics(function(err, data) {
                    isLoading = false;
                    if (!err && data && Array.isArray(data)) {
                        topics = data;
                    } else {
                        // Fallback: localStorage
                        try {
                            var local = JSON.parse(localStorage.getItem('md_forum_topics') || '[]');
                            if (local.length > 0) topics = local;
                        } catch(e) {}
                    }
                    renderTopics();
                });
            } else {
                isLoading = false;
                try {
                    topics = JSON.parse(localStorage.getItem('md_forum_topics') || '[]');
                } catch(e) {}
                renderTopics();
            }

            // ============================================
            // SAVE / LOAD DELETE CODES (przechowywane jak hasła w przeglądarce)
            // ============================================
            function saveDeleteCode(topicId, code) {
                if (!topicId || !code) return;
                try {
                    var saved = JSON.parse(localStorage.getItem('md_forum_codes') || '{}');
                    saved[topicId] = code;
                    localStorage.setItem('md_forum_codes', JSON.stringify(saved));
                } catch(e) {}
            }

            function getSavedDeleteCode(topicId) {
                if (!topicId) return null;
                try {
                    var saved = JSON.parse(localStorage.getItem('md_forum_codes') || '{}');
                    return saved[topicId] || null;
                } catch(e) { return null; }
            }

            // Sprzątanie kodu dla usuniętego tematu
            function removeSavedDeleteCode(topicId) {
                if (!topicId) return;
                try {
                    var saved = JSON.parse(localStorage.getItem('md_forum_codes') || '{}');
                    delete saved[topicId];
                    localStorage.setItem('md_forum_codes', JSON.stringify(saved));
                } catch(e) {}
            }

            // ============================================
            // DELETE CODE MODAL SYSTEM
            // ============================================
            function showDeleteCodeModal(type, tIdx, rIdx, onSuccess) {
                var modal = document.getElementById('deleteCodeModal');
                var input = document.getElementById('deleteCodeInput');
                var feedback = document.getElementById('deleteCodeFeedback');
                var confirmBtn = document.getElementById('deleteCodeConfirmBtn');
                var cancelBtn = document.getElementById('deleteCodeCancelBtn');
                var title = document.getElementById('deleteModalTitle');
                var desc = document.getElementById('deleteModalDesc');

                if (!modal || !input) return;

                title.textContent = 'Usuń ' + type;
                desc.textContent = 'Aby usunąć ten ' + type + ', wpisz kod usuwania, który otrzymałeś przy tworzeniu.';

                // Auto-uzupełnij kod z localStorage (jeśli zapamiętany)
                var savedCode = null;
                var topic = topics[tIdx];
                if (topic && topic.id) {
                    savedCode = getSavedDeleteCode(topic.id);
                }

                input.value = savedCode || '';
                feedback.textContent = savedCode ? '&#x1F512; Kod automatycznie wczytany z zapisanego' : '';
                feedback.className = savedCode ? 'field-feedback success' : 'field-feedback';
                modal.style.display = 'flex';

                function cleanup() {
                    modal.style.display = 'none';
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                }

                function handleConfirm() {
                    var code = input.value.trim().toUpperCase();
                    var topic = topics[tIdx];
                    if (!topic) {
                        feedback.textContent = 'Nie znaleziono tematu.';
                        feedback.className = 'field-feedback error';
                        return;
                    }

                    var expectedCode = topic.privateCode;
                    if (!expectedCode) {
                        // Topic was created before code system — allow with admin bypass
                        if (code === 'ADMIN') {
                            cleanup();
                            onSuccess();
                            return;
                        }
                        feedback.textContent = 'Ten temat nie ma kodu usuwania (sprzed aktualizacji). Skontaktuj się z administratorem.';
                        feedback.className = 'field-feedback error';
                        return;
                    }

                    if (code === expectedCode) {
                        cleanup();
                        onSuccess();
                    } else {
                        feedback.textContent = 'Nieprawidłowy kod usuwania. Sprawdź i spróbuj ponownie.';
                        feedback.className = 'field-feedback error';
                        input.value = '';
                        input.focus();
                    }
                }

                function handleCancel() {
                    cleanup();
                }

                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);

                // Enter key submits
                input.addEventListener('keydown', function onEnter(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm();
                    }
                });

                // Focus input
                setTimeout(function() { input.focus(); }, 100);
            }

            function showDeleteCodeDisplay(code, topicId) {
                var modal = document.getElementById('deleteCodeDisplayModal');
                var display = document.getElementById('deleteCodeDisplay');
                var closeBtn = document.getElementById('deleteCodeDisplayCloseBtn');
                if (!modal || !display) return;

                display.textContent = code;
                modal.style.display = 'flex';

                // Zapisz kod automatycznie, jeśli mamy ID tematu
                if (code && topicId) {
                    saveDeleteCode(topicId, code);
                } else if (code) {
                    // Dla starszych tematów — zapisz pod kluczem 'last'
                    try {
                        localStorage.setItem('md_last_forum_code', code);
                    } catch(e) {}
                }

                function close() {
                    modal.style.display = 'none';
                    closeBtn.removeEventListener('click', close);
                }

                closeBtn.addEventListener('click', close);
            }

            // Close modals on overlay click
            document.querySelectorAll('.modal-overlay').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    if (e.target === this) {
                        this.style.display = 'none';
                    }
                });
            });

            // New topic button
            var newTopicBtn = document.getElementById('forumNewTopicBtn');
            var newTopicForm = document.getElementById('forumNewTopicForm');
            var cancelTopicBtn = document.getElementById('forumCancelTopicBtn');

            if (newTopicBtn && newTopicForm) {
                newTopicBtn.addEventListener('click', function() {
                    newTopicForm.style.display = 'block';
                    newTopicForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }

            if (cancelTopicBtn && newTopicForm) {
                cancelTopicBtn.addEventListener('click', function() {
                    newTopicForm.style.display = 'none';
                    document.getElementById('forumTopicForm').reset();
                    document.querySelectorAll('#forumTopicForm .field-feedback').forEach(function(el) {
                        el.textContent = ''; el.className = 'field-feedback';
                    });
                    document.querySelectorAll('#forumTopicForm input.success, #forumTopicForm textarea.success').forEach(function(el) {
                        el.classList.remove('success');
                    });
                });
            }

            // Submit topic form
            var topicForm = document.getElementById('forumTopicForm');
            if (topicForm) {
                topicForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    var title = document.getElementById('forumTopicTitle');
                    var content = document.getElementById('forumTopicContent');
                    var submitBtn = document.getElementById('forumSubmitTopicBtn');

                    var hasError = false;
                    if (!title.value.trim()) {
                        title.classList.add('error');
                        var fb = document.getElementById('forumTopicTitle-feedback');
                        if (fb) { fb.textContent = 'To pole jest wymagane.'; fb.className = 'field-feedback error'; }
                        hasError = true;
                    }
                    if (!content.value.trim()) {
                        content.classList.add('error');
                        var fb = document.getElementById('forumTopicContent-feedback');
                        if (fb) { fb.textContent = 'To pole jest wymagane.'; fb.className = 'field-feedback error'; }
                        hasError = true;
                    }
                    if (hasError) return;

                    // Tymczasowe ID — zostanie zastąpione danymi z serwera po refreshTopics()
                    var tempId = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

                    topics.unshift({
                        id: tempId,
                        title: title.value.trim(),
                        content: content.value.trim(),
                        createdAt: new Date().toISOString(),
                        replies: [],
                        privateCode: null
                    });
                    saveTopics();
                    renderTopics();
                    showToast('Publikowanie tematu...', 'info', 3000);

                    // Wyślij przez Vercel API
                    if (typeof GitHubAPI !== 'undefined') {
                        GitHubAPI.postAction('create', {
                            title: title.value.trim(),
                            content: content.value.trim()
                        }, function(err, result) {
                            if (err) {
                                showToast('Temat dodany lokalnie. Błąd synchronizacji: ' + err, 'info', 5000);
                            } else {
                                var serverCode = result && result.deleteCode ? result.deleteCode : 'BŁĄD-KODU';
                                showToast('Temat został opublikowany na forum!', 'success', 4000);
                                showDeleteCodeDisplay(serverCode, tempId);
                                // Zapisz kod w przeglądarce (jak hasło)
                                saveDeleteCode(tempId, serverCode);
                                // Odśwież dane z serwera
                                refreshTopics(function() {
                                    // Migruj zapisany kod z tempId na serwerowe ID
                                    // Używamy ID z odpowiedzi API (result.topic.id) — najbezpieczniejsze
                                    var realId = result && result.topic ? result.topic.id : null;
                                    if (!realId && topics.length > 0 && topics[0] && topics[0].id) {
                                        realId = topics[0].id;
                                    }
                                    if (realId) {
                                        saveDeleteCode(realId, serverCode);
                                        removeSavedDeleteCode(tempId);
                                    }
                                    renderTopics();
                                });
                            }
                        });
                    } else {
                        // Tryb offline — wygeneruj kod lokalnie
                        var offlineCode = GitHubAPI && GitHubAPI.generateDeleteCode ? GitHubAPI.generateDeleteCode() : 'ADMIN';
                        showToast('Temat dodany lokalnie (tryb offline)', 'info', 4000);
                        showDeleteCodeDisplay(offlineCode);
                        // Zapisz kod lokalnie
                        topics[0].privateCode = offlineCode;
                        saveTopics();
                        saveDeleteCode(tempId, offlineCode);
                    }

                    topicForm.reset();
                    newTopicForm.style.display = 'none';
                    document.querySelectorAll('#forumTopicForm .field-feedback').forEach(function(el) {
                        el.textContent = ''; el.className = 'field-feedback';
                    });
                    document.querySelectorAll('#forumTopicForm input.success, #forumTopicForm textarea.success').forEach(function(el) {
                        el.classList.remove('success');
                    });
                    renderTopics();
                    document.getElementById('forumTopicsList').scrollIntoView({ behavior: 'smooth', block: 'start' });
                });

                // Real-time validation
                topicForm.querySelectorAll('input, textarea').forEach(function(el) {
                    el.addEventListener('blur', function() {
                        var fb = document.getElementById(this.id + '-feedback');
                        if (!fb) return;
                        if (this.value.trim()) {
                            this.classList.remove('error'); this.classList.add('success');
                            fb.textContent = '&#x2714; Poprawnie wypełnione'; fb.className = 'field-feedback success';
                        } else if (this.hasAttribute('required')) {
                            this.classList.remove('success'); this.classList.add('error');
                            fb.textContent = 'To pole jest wymagane.'; fb.className = 'field-feedback error';
                        }
                    });
                    el.addEventListener('input', function() {
                        if (this.classList.contains('error')) {
                            this.classList.remove('error');
                            var fb = document.getElementById(this.id + '-feedback');
                            if (fb) { fb.textContent = ''; fb.className = 'field-feedback'; }
                        }
                    });
                });
            }
        })();

        // ============================================
        // VERDICTS — load, render, delete
        // ============================================
        window.loadVerdicts = function() {
            var container = document.getElementById('dynamic-verdicts');
            if (!container) return;

            if (typeof GitHubAPI !== 'undefined' && GitHubAPI.readVerdicts) {
                GitHubAPI.readVerdicts(function(err, data) {
                    if (!err && data && Array.isArray(data)) {
                        window._verdicts = data;
                        renderVerdicts(data);
                    } else {
                        var local = JSON.parse(localStorage.getItem('md_verdicts') || '[]');
                        window._verdicts = local;
                        renderVerdicts(local);
                    }
                });
            } else {
                var local = JSON.parse(localStorage.getItem('md_verdicts') || '[]');
                window._verdicts = local;
                renderVerdicts(local);
            }
        };

        function renderVerdicts(verdicts) {
            var container = document.getElementById('dynamic-verdicts');
            if (!container) return;

            container.innerHTML = '';

            if (!verdicts || verdicts.length === 0) {
                container.innerHTML = '<div class="empty-state" id="empty-verdicts-msg"><div class="empty-state-title">Brak orzeczeń</div><p>Żadne orzeczenie nie zostało jeszcze opublikowane. Skorzystaj z formularza powyżej, aby dodać własne!</p></div>';
                return;
            }

            verdicts.forEach(function(v, idx) {
                var date = new Date(v.createdAt || Date.now());
                var dateStr = date.toLocaleDateString('pl-PL');
                var fileUrl = v.fileUrl || v.data || '#';
                var btnText = v.fileName ? 'Otwórz plik (' + escapeHtml(v.fileName) + ')' : 'Zobacz orzeczenie';

                var card = document.createElement('div');
                card.className = 'card';
                card.style.animation = 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

                var panelHtml = '';
                if (v.presiding) panelHtml += '<p><strong>Przewodniczący:</strong> ' + escapeHtml(v.presiding) + '</p>';
                if (v.judge) panelHtml += '<p><strong>Sędzia sprawozdawca:</strong> ' + escapeHtml(v.judge) + '</p>';
                if (v.member) panelHtml += '<p><strong>Sędziowie:</strong> ' + escapeHtml(v.member) + '</p>';

                card.innerHTML =
                    '<h3>' + escapeHtml(v.title) + '</h3>' +
                    '<p><strong>Organ orzekający:</strong> ' + escapeHtml(v.court) + '</p>' +
                    panelHtml +
                    '<p>' + escapeHtml(v.desc) + '</p>' +
                    '<p style="font-size:0.85rem;color:var(--text-muted);margin-top:12px;">Dodano: ' + dateStr + '</p>' +
                    '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">' +
                        '<a href="' + fileUrl + '" target="_blank" class="btn-action" style="font-size:0.85rem;" rel="noopener">' +
                            '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3v10"/><path d="M7 7l3-4 3 4"/><path d="M2 15v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg> ' + btnText + '</a>' +
                        '<button class="verdict-del-btn" data-idx="' + idx + '" title="Usuń orzeczenie" style="background:none;border:1px solid var(--danger);color:var(--danger);cursor:pointer;padding:4px 12px;font-size:0.85rem;border-radius:6px;transition:var(--t-fast);">&#x2716; Usuń</button>' +
                    '</div>';

                container.appendChild(card);
            });

            // Delete handlers
            container.querySelectorAll('.verdict-del-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = parseInt(this.getAttribute('data-idx'));
                    showVerdictDeleteModal(idx);
                });
            });
        }

        function showVerdictDeleteCodeDisplay(code) {
            var modal = document.getElementById('deleteCodeDisplayModal');
            var display = document.getElementById('deleteCodeDisplay');
            var closeBtn = document.getElementById('deleteCodeDisplayCloseBtn');
            if (!modal || !display) return;
            display.textContent = code;
            modal.style.display = 'flex';
            try {
                var codes = JSON.parse(localStorage.getItem('md_verdict_codes') || '{}');
                codes['last'] = code;
                localStorage.setItem('md_verdict_codes', JSON.stringify(codes));
            } catch(e) {}
            function close() {
                modal.style.display = 'none';
                closeBtn.removeEventListener('click', close);
            }
            closeBtn.addEventListener('click', close);
        }

        function getVerdictCode(idx) {
            var v = window._verdicts && window._verdicts[idx];
            if (v && v.id) {
                try {
                    var codes = JSON.parse(localStorage.getItem('md_verdict_codes') || '{}');
                    return codes[v.id] || codes['last'] || null;
                } catch(e) { return null; }
            }
            try {
                var codes = JSON.parse(localStorage.getItem('md_verdict_codes') || '{}');
                return codes['last'] || null;
            } catch(e) { return null; }
        }

        function showVerdictDeleteModal(idx) {
            var allVerdicts = window._verdicts || [];
            var v = allVerdicts[idx];
            if (!v) {
                showToast('Nie znaleziono orzeczenia.', 'error', 3000);
                return;
            }

            var modal = document.getElementById('deleteCodeModal');
            var input = document.getElementById('deleteCodeInput');
            var feedback = document.getElementById('deleteCodeFeedback');
            var confirmBtn = document.getElementById('deleteCodeConfirmBtn');
            var cancelBtn = document.getElementById('deleteCodeCancelBtn');
            var mTitle = document.getElementById('deleteModalTitle');
            var mDesc = document.getElementById('deleteModalDesc');

            if (!modal || !input) return;

            mTitle.textContent = 'Usuń orzeczenie';
            mDesc.textContent = 'Aby usunąć to orzeczenie, wpisz kod usuwania otrzymany przy publikacji.';

            var savedCode = getVerdictCode(idx);
            input.value = savedCode || '';
            feedback.textContent = savedCode ? 'Kod automatycznie wczytany' : '';
            feedback.className = savedCode ? 'field-feedback success' : 'field-feedback';
            modal.style.display = 'flex';

            function cleanup() {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            }

            function handleConfirm() {
                var code = input.value.trim().toUpperCase();
                if (!code) {
                    feedback.textContent = 'Wpisz kod usuwania.';
                    feedback.className = 'field-feedback error';
                    return;
                }

                if (typeof GitHubAPI !== 'undefined' && GitHubAPI.postVerdictAction) {
                    GitHubAPI.postVerdictAction('delete', { idx: idx, code: code }, function(err) {
                        cleanup();
                        if (err) {
                            showToast('Błąd: ' + err, 'error', 5000);
                        } else {
                            showToast('Orzeczenie usunięte.', 'success', 4000);
                            loadVerdicts();
                        }
                    });
                } else {
                    // Fallback: localStorage
                    var local = JSON.parse(localStorage.getItem('md_verdicts') || '[]');
                    if (code === 'ADMIN' || (v.privateCode && code === v.privateCode)) {
                        local.splice(idx, 1);
                        localStorage.setItem('md_verdicts', JSON.stringify(local));
                        cleanup();
                        showToast('Orzeczenie usunięte lokalnie.', 'info', 3000);
                        loadVerdicts();
                    } else {
                        feedback.textContent = 'Nieprawidłowy kod.';
                        feedback.className = 'field-feedback error';
                    }
                }
            }

            function handleCancel() {
                cleanup();
            }

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            input.addEventListener('keydown', function onEnter(e) {
                if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
            });
            setTimeout(function() { input.focus(); }, 100);
        }

        // Load verdicts on page load
        if (typeof loadVerdicts === 'function') {
            loadVerdicts();
        }

        // ============================================
        // UKRYTY PANEL ADMINISTRATORA
        // ============================================
        // Aktywacja: kliknij logo 5 razy
        // ============================================
        (function() {
            // Lokalny escapeHtml (niezależny od innych scope'ów)
            function escapeHtml(text) {
                var div = document.createElement('div');
                div.appendChild(document.createTextNode(text));
                return div.innerHTML;
            }
            var logoClickCount = 0;
            var logo = document.querySelector('.nav-logo, .nav-brand');
            if (logo) {
                logo.addEventListener('click', function() {
                    logoClickCount++;
                    if (logoClickCount >= 5) {
                        logoClickCount = 0;
                        var panel = document.getElementById('adminPanel');
                        if (panel) {
                            panel.style.display = 'block';
                            showToast('Panel administratora aktywowany', 'info', 3000);
                        }
                    }
                });
            }

            // ============================================
            // KEYBOARD SHORTCUT: Ctrl+Alt+P — aktywacja panelu admina
            // ============================================
            document.addEventListener('keydown', function(e) {
                // Ctrl+Alt bez Shifta — prosty 3-klawiszowy skrót
                if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyP') {
                    e.preventDefault();
                    var panel = document.getElementById('adminPanel');
                    if (panel) {
                        var curDisplay = panel.style.display;
                        if (curDisplay === 'none' || curDisplay === '') {
                            panel.style.display = 'block';
                            showToast('Panel administratora aktywowany', 'info', 3000);
                        } else {
                            panel.style.display = 'none';
                            showToast('Panel administratora zamknięty', 'info', 2000);
                        }
                    }
                }
            });

            // Admin API helper — wzorowana na GitHubAPI
            function getAdminUrl() {
                var host = window.location.hostname;
                if (host.indexOf('vercel.app') !== -1 || host.indexOf('localhost') !== -1 || host === '127.0.0.1') {
                    return '/api/admin';
                }
                var baseUrl = (typeof FORUM_CONFIG !== 'undefined' && FORUM_CONFIG.vercelApiUrl)
                    ? FORUM_CONFIG.vercelApiUrl
                    : '/api/admin';
                return baseUrl + '/api/admin';
            }

            // Dodaj sprawę
            var addCaseBtn = document.getElementById('adminAddCaseBtn');
            if (addCaseBtn) {
                addCaseBtn.addEventListener('click', function() {
                    var title = document.getElementById('adminCaseTitle');
                    var sygnatura = document.getElementById('adminCaseSygnatura');
                    var desc = document.getElementById('adminCaseDesc');
                    var fileInput = document.getElementById('adminCaseFile');
                    var feedback = document.getElementById('adminCaseFeedback');

                    if (!title || !title.value.trim()) {
                        if (feedback) feedback.textContent = 'Wpisz tytuł sprawy.';
                        return;
                    }
                    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                        if (feedback) feedback.textContent = 'Wybierz plik HTML.';
                        return;
                    }

                    var file = fileInput.files[0];
                    if (!file.name.toLowerCase().endsWith('.html')) {
                        if (feedback) feedback.textContent = 'Plik musi być w formacie HTML.';
                        return;
                    }

                    if (feedback) feedback.textContent = 'Wysyłanie...';
                    addCaseBtn.disabled = true;

                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        // Zapytaj o hasło admina
                        var password = prompt('Podaj hasło administratora:');
                        if (!password) {
                            if (feedback) feedback.textContent = 'Anulowano.';
                            addCaseBtn.disabled = false;
                            return;
                        }

                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', getAdminUrl(), true);
                        xhr.setRequestHeader('Content-Type', 'application/json');
                        xhr.setRequestHeader('Accept', 'application/json');

                        xhr.onload = function() {
                            addCaseBtn.disabled = false;
                            if (xhr.status >= 200 && xhr.status < 300) {
                                if (feedback) {
                                    feedback.textContent = '&#x2714; Sprawa opublikowana! Odśwież stronę, aby zobaczyć.';
                                    feedback.style.color = 'var(--success)';
                                }
                                title.value = '';
                                if (sygnatura) sygnatura.value = '';
                                if (desc) desc.value = '';
                                fileInput.value = '';
                                showToast('Sprawa dodana! Odśwież stronę.', 'success', 5000);
                            } else {
                                var errMsg = 'Błąd (HTTP ' + xhr.status + ')';
                                try { var d = JSON.parse(xhr.responseText); if (d.error) errMsg = d.error; } catch(e) {}
                                if (feedback) {
                                    feedback.textContent = '&#x2716; ' + errMsg;
                                    feedback.style.color = 'var(--danger)';
                                }
                            }
                        };

                        xhr.onerror = function() {
                            addCaseBtn.disabled = false;
                            if (feedback) {
                                feedback.textContent = '&#x2716; Błąd sieci.';
                                feedback.style.color = 'var(--danger)';
                            }
                        };

                        xhr.send(JSON.stringify({
                            action: 'addCase',
                            password: password,
                            title: title.value.trim(),
                            sygnatura: sygnatura ? sygnatura.value.trim() : '',
                            desc: desc ? desc.value.trim() : '',
                            htmlContent: ev.target.result
                        }));
                    };
                    reader.readAsText(file);
                });
            }

            // Dodaj generator
            var addGenBtn = document.getElementById('adminAddGeneratorBtn');
            if (addGenBtn) {
                addGenBtn.addEventListener('click', function() {
                    var title = document.getElementById('adminGenTitle');
                    var desc = document.getElementById('adminGenDesc');
                    var fileInput = document.getElementById('adminGenFile');
                    var feedback = document.getElementById('adminGenFeedback');

                    if (!title || !title.value.trim()) {
                        if (feedback) feedback.textContent = 'Wpisz nazwę generatora.';
                        return;
                    }
                    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                        if (feedback) feedback.textContent = 'Wybierz plik HTML.';
                        return;
                    }

                    var file = fileInput.files[0];
                    if (!file.name.toLowerCase().endsWith('.html')) {
                        if (feedback) feedback.textContent = 'Plik musi być w formacie HTML.';
                        return;
                    }

                    if (feedback) feedback.textContent = 'Wysyłanie...';
                    addGenBtn.disabled = true;

                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        var password = prompt('Podaj hasło administratora:');
                        if (!password) {
                            if (feedback) feedback.textContent = 'Anulowano.';
                            addGenBtn.disabled = false;
                            return;
                        }

                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', getAdminUrl(), true);
                        xhr.setRequestHeader('Content-Type', 'application/json');
                        xhr.setRequestHeader('Accept', 'application/json');

                        xhr.onload = function() {
                            addGenBtn.disabled = false;
                            if (xhr.status >= 200 && xhr.status < 300) {
                                if (feedback) {
                                    feedback.textContent = '&#x2714; Generator opublikowany! Odśwież stronę.';
                                    feedback.style.color = 'var(--success)';
                                }
                                title.value = '';
                                if (desc) desc.value = '';
                                fileInput.value = '';
                                showToast('Generator dodany! Odśwież stronę.', 'success', 5000);
                            } else {
                                var errMsg = 'Błąd (HTTP ' + xhr.status + ')';
                                try { var d = JSON.parse(xhr.responseText); if (d.error) errMsg = d.error; } catch(e) {}
                                if (feedback) {
                                    feedback.textContent = '&#x2716; ' + errMsg;
                                    feedback.style.color = 'var(--danger)';
                                }
                            }
                        };

                        xhr.onerror = function() {
                            addGenBtn.disabled = false;
                            if (feedback) {
                                feedback.textContent = '&#x2716; Błąd sieci.';
                                feedback.style.color = 'var(--danger)';
                            }
                        };

                        xhr.send(JSON.stringify({
                            action: 'addGenerator',
                            password: password,
                            title: title.value.trim(),
                            desc: desc ? desc.value.trim() : '',
                            htmlContent: ev.target.result
                        }));
                    };
                    reader.readAsText(file);
                });
            }

            // Ładowanie dynamicznych treści z manifestu admina
            function loadAdminContent() {
                var adminUrl = getAdminUrl();
                // Dla GET, po prostu fetch
                var xhr = new XMLHttpRequest();
                xhr.open('GET', adminUrl, true);
                xhr.setRequestHeader('Accept', 'application/json');

                xhr.onload = function() {
                    if (xhr.status === 200) {
                        try {
                            var manifest = JSON.parse(xhr.responseText);
                            renderAdminCases(manifest.cases || []);
                            renderAdminGenerators(manifest.generators || []);
                        } catch(e) {}
                    }
                };
                xhr.send();
            }

            function renderAdminCases(cases) {
                if (!cases || cases.length === 0) return;
                var grid = document.getElementById('sprawyGrid');
                if (!grid) return;

                cases.forEach(function(c) {
                    var card = document.createElement('div');
                    card.className = 'card';
                    card.style.animation = 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    card.innerHTML =
                        '<h3>' + escapeHtml(c.title) + '</h3>' +
                        (c.sygnatura ? '<p><strong>Sygnatura:</strong> ' + escapeHtml(c.sygnatura) + '</p>' : '') +
                        (c.desc ? '<p>' + escapeHtml(c.desc) + '</p>' : '') +
                        '<a href="' + (c.fileUrl || c.filePath) + '" target="_blank" class="btn-action" style="margin-top:10px;" rel="noopener">Otwórz teczkę</a>';
                    grid.appendChild(card);
                });
            }

            function renderAdminGenerators(generators) {
                if (!generators || generators.length === 0) return;
                var tab = document.getElementById('tab-generatory');
                if (!tab) return;
                var grid = tab.querySelector('.cards-grid');
                if (!grid) return;

                generators.forEach(function(g) {
                    var card = document.createElement('div');
                    card.className = 'card';
                    card.style.animation = 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    card.innerHTML =
                        '<h3>' + escapeHtml(g.title) + '</h3>' +
                        (g.desc ? '<p>' + escapeHtml(g.desc) + '</p>' : '') +
                        '<a href="' + (g.fileUrl || g.filePath) + '" target="_blank" class="btn-action" download rel="noopener">Pobierz HTML</a>';
                    grid.appendChild(card);
                });
            }

            // Załaduj zawartość admina po załadowaniu strony
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                loadAdminContent();
            } else {
                document.addEventListener('DOMContentLoaded', loadAdminContent);
            }
        })();

        // Load community cases on page load
        if (typeof loadCommunityCases === 'function') {
            loadCommunityCases();
        }
