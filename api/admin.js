// ============================================
// Admin API — Vercel Serverless Function
// ============================================
// Rozszerzone narzędzie do zarządzania CAŁĄ zawartością strony:
// - Oficjalne sprawy i generatory (admin/contents.json)
// - Sprawy społeczności (spolecznosc/manifest.json)
// - Orzeczenia (orzeczenia/manifest.json)
// Admin może edytować i usuwać dowolne treści z pominięciem kodu prywatnego.
// ============================================

const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';

const MANIFESTS = {
    admin: { path: 'admin/contents.json', default: { cases: [], generators: [] } },
    spolecznosc: { path: 'spolecznosc/manifest.json', default: [] },
    orzeczenia: { path: 'orzeczenia/manifest.json', default: [] }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const adminPassword = process.env.ADMIN_PASSWORD || 'Materiadowodowa@2026';

    if (!token || !repo) {
        return res.status(500).json({ error: 'Brak konfiguracji GITHUB_TOKEN lub GITHUB_REPO.' });
    }

    const headers = {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    try {
        if (req.method === 'GET') {
            const target = req.query.target || 'all';
            return await handleGet(req, res, headers, repo, target);
        }
        if (req.method === 'POST') {
            return await handlePost(req, res, headers, repo, adminPassword);
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Błąd serwera' });
    }
}

// ============================================
// GET — odczytaj zawartość
// ============================================
async function handleGet(req, res, headers, repo, target) {
    if (target === 'all') {
        // Zwróć wszystko
        const [adminData, spolecznoscData, orzeczeniaData] = await Promise.all([
            readManifest(headers, repo, 'admin'),
            readManifest(headers, repo, 'spolecznosc'),
            readManifest(headers, repo, 'orzeczenia')
        ]);
        return res.status(200).json({
            official: adminData,
            community: Array.isArray(spolecznoscData) ? spolecznoscData : [],
            verdicts: Array.isArray(orzeczeniaData) ? orzeczeniaData : []
        });
    }

    // Pojedynczy manifest
    const manifestKey = MANIFESTS[target];
    if (!manifestKey) {
        return res.status(400).json({ error: 'Nieznany target: ' + target });
    }
    const data = await readManifest(headers, repo, target);
    return res.status(200).json(data);
}

// ============================================
// POST — akcje (wymagają hasła admina)
// ============================================
async function handlePost(req, res, headers, repo, adminPassword) {
    const { password, action } = req.body || {};

    if (password !== adminPassword) {
        return res.status(403).json({ error: 'Nieprawidłowe hasło administratora.' });
    }

    switch (action) {
        // Istniejące akcje
        case 'addCase':
            return await handleAddCase(req, res, headers, repo);
        case 'addGenerator':
            return await handleAddGenerator(req, res, headers, repo);
        case 'deleteItem':
            return await handleDeleteItem(req, res, headers, repo);
        // Nowe akcje moderacji
        case 'moderateDelete':
            return await handleModerateDelete(req, res, headers, repo);
        case 'moderateEdit':
            return await handleModerateEdit(req, res, headers, repo);
        case 'replaceFile':
            return await handleReplaceFile(req, res, headers, repo);
        case 'addCommunityCase':
            return await handleAddCommunityCase(req, res, headers, repo);
        default:
            return res.status(400).json({ error: 'Nieznana akcja: ' + action });
    }
}

// ============================================
// Pomocnik: odczyt manifestu z GitHub
// ============================================
async function readManifest(headers, repo, key) {
    const cfg = MANIFESTS[key];
    if (!cfg) return null;
    const url = `${GITHUB_API}/repos/${repo}/contents/${cfg.path}`;
    const response = await fetch(url, { headers });
    if (response.status === 404) {
        return JSON.parse(JSON.stringify(cfg.default));
    }
    if (!response.ok) return null;
    const data = await response.json();
    try {
        return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    } catch(e) {
        return JSON.parse(JSON.stringify(cfg.default));
    }
}

// ============================================
// Pomocnik: zapis manifestu do GitHub
// ============================================
async function writeManifest(headers, repo, key, data, sha, message) {
    const cfg = MANIFESTS[key];
    if (!cfg) return { success: false, error: 'Nieznany manifest' };
    const url = `${GITHUB_API}/repos/${repo}/contents/${cfg.path}`;
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const body = {
        message: message + ' (' + new Date().toLocaleString('pl-PL') + ')',
        content: content,
        branch: 'main'
    };
    if (sha) body.sha = sha;
    try {
        const resp = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (resp.ok) return { success: true };
        const err = await resp.json().catch(() => ({}));
        return { success: false, error: err.message || 'HTTP ' + resp.status };
    } catch (err) {
        return { success: false, error: err.message || 'Błąd sieci' };
    }
}

// ============================================
// Pomocnik: pobierz informacje o pliku z GitHub (SHA)
// ============================================
async function getFileInfo(headers, repo, filePath) {
    const url = `${GITHUB_API}/repos/${repo}/contents/${filePath}`;
    try {
        const resp = await fetch(url, { headers });
        if (resp.ok) {
            const data = await resp.json();
            return { sha: data.sha, exists: true };
        }
        return { sha: null, exists: false };
    } catch(e) {
        return { sha: null, exists: false };
    }
}

// ============================================
// Pomocnik: zapisz plik do repo
// ============================================
async function saveFile(headers, repo, filePath, content, message, sha) {
    const url = `${GITHUB_API}/repos/${repo}/contents/${filePath}`;
    const body = {
        message: message + ' (' + new Date().toLocaleString('pl-PL') + ')',
        content: content,
        branch: 'main'
    };
    if (sha) body.sha = sha;
    try {
        const resp = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
        return { success: resp.ok, status: resp.status };
    } catch(err) {
        return { success: false, error: err.message };
    }
}

// ============================================
// Pomocnik: usuń plik z repo
// ============================================
async function deleteFile(headers, repo, filePath, sha, message) {
    const url = `${GITHUB_API}/repos/${repo}/contents/${filePath}`;
    const body = {
        message: message + ' (' + new Date().toLocaleString('pl-PL') + ')',
        sha: sha,
        branch: 'main'
    };
    try {
        const resp = await fetch(url, { method: 'DELETE', headers, body: JSON.stringify(body) });
        return { success: resp.ok };
    } catch(err) {
        return { success: false, error: err.message };
    }
}

// ============================================
// Pobierz manifest + SHA
// ============================================
async function getManifestWithSha(headers, repo, key) {
    const cfg = MANIFESTS[key];
    const url = `${GITHUB_API}/repos/${repo}/contents/${cfg.path}`;
    const resp = await fetch(url, { headers });
    let sha = null;
    let data = JSON.parse(JSON.stringify(cfg.default));
    if (resp.ok) {
        const fileData = await resp.json();
        sha = fileData.sha;
        try { data = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8')); }
        catch(e) { data = JSON.parse(JSON.stringify(cfg.default)); }
    }
    return { sha, data };
}

// ============================================
// DODAJ OFICJALNĄ SPRAWĘ
// ============================================
async function handleAddCase(req, res, headers, repo) {
    const { title, sygnatura, desc, htmlContent } = req.body || {};
    if (!title || !htmlContent) {
        return res.status(400).json({ error: 'Tytuł i zawartość HTML są wymagane' });
    }
    const fileId = 'sprawa-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const fileName = fileId + '.html';
    const repoFilePath = `sprawy/${fileName}`;

    const fileResult = await saveFile(headers, repo, repoFilePath,
        Buffer.from(htmlContent).toString('base64'),
        'Dodano oficjalną sprawę: ' + title.trim());

    if (!fileResult.success) {
        return res.status(500).json({ error: 'Błąd zapisu pliku (HTTP ' + fileResult.status + ')' });
    }

    const { sha, data: manifest } = await getManifestWithSha(headers, repo, 'admin');
    if (!manifest.cases) manifest.cases = [];

    const rawUrl = `${GITHUB_RAW}/${repo}/main/${repoFilePath}`;
    const newEntry = {
        id: fileId, title: title.trim(), sygnatura: sygnatura || '',
        desc: desc || '', fileName, filePath: repoFilePath, fileUrl: rawUrl,
        createdAt: new Date().toISOString()
    };
    manifest.cases.unshift(newEntry);

    const commitResult = await writeManifest(headers, repo, 'admin', manifest, sha, 'Dodano sprawę: ' + title.trim());
    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    }
    return res.status(201).json({ success: true, entry: newEntry });
}

// ============================================
// DODAJ GENERATOR
// ============================================
async function handleAddGenerator(req, res, headers, repo) {
    const { title, desc, htmlContent } = req.body || {};
    if (!title || !htmlContent) {
        return res.status(400).json({ error: 'Tytuł i zawartość HTML są wymagane' });
    }
    const fileId = 'gen-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const fileName = fileId + '.html';
    const repoFilePath = `generatory/${fileName}`;

    const fileResult = await saveFile(headers, repo, repoFilePath,
        Buffer.from(htmlContent).toString('base64'),
        'Dodano generator: ' + title.trim());

    if (!fileResult.success) {
        return res.status(500).json({ error: 'Błąd zapisu pliku (HTTP ' + fileResult.status + ')' });
    }

    const { sha, data: manifest } = await getManifestWithSha(headers, repo, 'admin');
    if (!manifest.generators) manifest.generators = [];

    const rawUrl = `${GITHUB_RAW}/${repo}/main/${repoFilePath}`;
    const newEntry = {
        id: fileId, title: title.trim(), desc: desc || '',
        fileName, filePath: repoFilePath, fileUrl: rawUrl,
        createdAt: new Date().toISOString()
    };
    manifest.generators.unshift(newEntry);

    const commitResult = await writeManifest(headers, repo, 'admin', manifest, sha, 'Dodano generator: ' + title.trim());
    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    }
    return res.status(201).json({ success: true, entry: newEntry });
}

// ============================================
// DODAJ SPRAWĘ SPOŁECZNOŚCI (przez admina)
// ============================================
async function handleAddCommunityCase(req, res, headers, repo) {
    const { title, sygnatura, court, type, power, defendant, desc, author, format, fileName, data, size } = req.body || {};
    if (!title || !desc) {
        return res.status(400).json({ error: 'Tytuł i opis są wymagane' });
    }
    const caseId = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const ext = (format === 'pdf') ? 'pdf' : 'html';
    const repoFilePath = `spolecznosc/files/${caseId}.${ext}`;
    const rawFileUrl = `${GITHUB_RAW}/${repo}/main/${repoFilePath}`;

    // Zapisz plik jeśli przesłany
    if (data && data.length > 10) {
        const base64Match = data.match(/^data:[^;]+;base64,(.+)$/);
        const fileContent = base64Match ? base64Match[1] : Buffer.from(data).toString('base64');
        await saveFile(headers, repo, repoFilePath, fileContent,
            'Admin dodał sprawę społeczności: ' + title.trim());
    }

    const { sha, data: cases } = await getManifestWithSha(headers, repo, 'spolecznosc');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let deleteCode = '';
    for (let i = 0; i < 8; i++) deleteCode += chars.charAt(Math.floor(Math.random() * chars.length));

    const list = Array.isArray(cases) ? cases : [];
    const newCase = {
        id: caseId, title: title.trim(), sygnatura: sygnatura || '', court: court || '',
        type: type || 'Inna', power: power || '', defendant: defendant || '',
        desc: desc.trim(), author: author || 'Administrator',
        format: format || 'html', fileName: fileName || `${caseId}.${ext}`,
        fileUrl: rawFileUrl, size: size || 0,
        createdAt: new Date().toISOString(), privateCode: deleteCode
    };
    list.unshift(newCase);

    const commitResult = await writeManifest(headers, repo, 'spolecznosc', list, sha, 'Admin dodał sprawę: ' + title.trim());
    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    }
    return res.status(201).json({ success: true, deleteCode, caseData: newCase });
}

// ============================================
// USUŃ ITEM Z ADMIN/CONTENTS (istniejący)
// ============================================
async function handleDeleteItem(req, res, headers, repo) {
    const { contentType, itemId } = req.body || {};
    if (!contentType || !itemId) {
        return res.status(400).json({ error: 'Brak contentType lub itemId' });
    }
    const { sha, data: manifest } = await getManifestWithSha(headers, repo, 'admin');
    const list = contentType === 'case' ? manifest.cases : manifest.generators;
    if (!Array.isArray(list)) return res.status(404).json({ error: 'Nie znaleziono listy' });
    const idx = list.findIndex(item => item.id === itemId);
    if (idx === -1) return res.status(404).json({ error: 'Nie znaleziono wpisu' });
    const item = list[idx];
    if (item.filePath) {
        const info = await getFileInfo(headers, repo, item.filePath);
        if (info.exists && info.sha) {
            await deleteFile(headers, repo, item.filePath, info.sha, 'Admin usunął: ' + item.title);
        }
    }
    list.splice(idx, 1);
    const commitResult = await writeManifest(headers, repo, 'admin', manifest, sha, 'Admin usunął: ' + item.title);
    if (!commitResult.success) return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    return res.status(200).json({ success: true });
}

// ============================================
// MODERATE DELETE — usuń dowolną treść (admin bypass)
// ============================================
async function handleModerateDelete(req, res, headers, repo) {
    const { manifest: target, itemId, itemIdx } = req.body || {};
    if (!target) return res.status(400).json({ error: 'Brak parametru manifest (admin/spolecznosc/orzeczenia)' });
    if (target === 'admin') {
        // Przekieruj do istniejącej obsługi
        req.body.contentType = req.body.contentType || (itemId && itemId.indexOf('gen-') === 0 ? 'generator' : 'case');
        return await handleDeleteItem(req, res, headers, repo);
    }

    const manifestKey = target === 'spolecznosc' ? 'spolecznosc' : 'orzeczenia';
    const { sha, data } = await getManifestWithSha(headers, repo, manifestKey);
    let list = Array.isArray(data) ? data : [];

    let item = null;
    if (itemId) {
        const found = list.find(x => x.id === itemId);
        if (found) { item = found; }
    }
    if (!item && itemIdx !== undefined && itemIdx !== null) {
        const idx = parseInt(itemIdx);
        if (idx >= 0 && idx < list.length) item = list[idx];
    }
    if (!item) return res.status(404).json({ error: 'Nie znaleziono elementu' });

    const itemTitle = item.title || item.name || 'bez nazwy';

    // Usuń powiązany plik
    if (item.id) {
        const ext = target === 'spolecznosc' ? (item.format === 'pdf' ? 'pdf' : 'html') : 'pdf';
        const filePath = target === 'spolecznosc'
            ? `spolecznosc/files/${item.id}.${ext}`
            : `orzeczenia/files/${item.id}.${ext}`;
        const info = await getFileInfo(headers, repo, filePath);
        if (info.exists && info.sha) {
            await deleteFile(headers, repo, filePath, info.sha, 'Admin usunął plik: ' + itemTitle);
        }
    }

    // Usuń z manifestu
    list = list.filter(x => x.id !== item.id);
    if (!itemId && itemIdx !== undefined && itemIdx !== null) {
        list.splice(parseInt(itemIdx), 1);
    }

    const commitResult = await writeManifest(headers, repo, manifestKey, list, sha, 'Admin usunął: ' + itemTitle);
    if (!commitResult.success) return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    return res.status(200).json({ success: true });
}

// ============================================
// MODERATE EDIT — edytuj dowolną treść (admin bypass)
// ============================================
async function handleModerateEdit(req, res, headers, repo) {
    const { manifest: target, itemId, itemIdx, title, sygnatura, court, type, power, defendant, desc, author, presiding, judge, member, data, fileName, size } = req.body || {};
    if (!target) return res.status(400).json({ error: 'Brak parametru manifest' });

    if (target === 'admin') {
        const { sha, data: manifest } = await getManifestWithSha(headers, repo, 'admin');
        const list = (itemId && itemId.indexOf('gen-') === 0) ? manifest.generators : manifest.cases;
        if (!Array.isArray(list)) return res.status(404).json({ error: 'Nie znaleziono' });
        const idx = itemId ? list.findIndex(x => x.id === itemId) : (itemIdx !== undefined ? parseInt(itemIdx) : -1);
        if (idx < 0 || idx >= list.length) return res.status(404).json({ error: 'Nie znaleziono' });
        const item = list[idx];
        if (title) item.title = title.trim();
        if (sygnatura !== undefined) item.sygnatura = sygnatura;
        if (desc !== undefined) item.desc = desc;
        item.modifiedAt = new Date().toISOString();
        const commitResult = await writeManifest(headers, repo, 'admin', manifest, sha, 'Admin edytował: ' + item.title);
        if (!commitResult.success) return res.status(500).json({ error: commitResult.error });
        return res.status(200).json({ success: true, item });
    }

    const manifestKey = target === 'spolecznosc' ? 'spolecznosc' : 'orzeczenia';
    const { sha, data: manifestData } = await getManifestWithSha(headers, repo, manifestKey);
    let list = Array.isArray(manifestData) ? manifestData : [];
    let idx = -1;
    if (itemId) idx = list.findIndex(x => x.id === itemId);
    if (idx === -1 && itemIdx !== undefined && itemIdx !== null) idx = parseInt(itemIdx);
    if (idx < 0 || idx >= list.length) return res.status(404).json({ error: 'Nie znaleziono' });

    const item = list[idx];

    // Obsługa nowego pliku
    let newFileUrl = item.fileUrl || '';
    if (data && data.length > 10 && item.id) {
        const ext = target === 'spolecznosc' ? (item.format === 'pdf' ? 'pdf' : 'html') : 'pdf';
        const filePath = target === 'spolecznosc'
            ? `spolecznosc/files/${item.id}.${ext}`
            : `orzeczenia/files/${item.id}.${ext}`;
        const base64Match = data.match(/^data:[^;]+;base64,(.+)$/);
        const fileContent = base64Match ? base64Match[1] : Buffer.from(data).toString('base64');
        const info = await getFileInfo(headers, repo, filePath);
        const fileResult = await saveFile(headers, repo, filePath, fileContent,
            'Admin zaktualizował plik: ' + (item.title || 'bez nazwy'), info.sha);
        if (fileResult.success) {
            newFileUrl = `${GITHUB_RAW}/${repo}/main/${filePath}`;
        }
    }

    if (title) item.title = title.trim();
    if (sygnatura !== undefined) item.sygnatura = sygnatura;
    if (court !== undefined) item.court = court;
    if (type !== undefined) item.type = type;
    if (power !== undefined) item.power = power;
    if (defendant !== undefined) item.defendant = defendant;
    if (desc !== undefined) item.desc = desc;
    if (author !== undefined) item.author = author;
    if (presiding !== undefined) item.presiding = presiding;
    if (judge !== undefined) item.judge = judge;
    if (member !== undefined) item.member = member;
    if (fileName) item.fileName = fileName;
    if (size) item.size = size;
    if (newFileUrl) item.fileUrl = newFileUrl;
    item.modifiedAt = new Date().toISOString();

    const commitResult = await writeManifest(headers, repo, manifestKey, list, sha, 'Admin edytował: ' + (item.title || 'bez nazwy'));
    if (!commitResult.success) return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    return res.status(200).json({ success: true, item });
}

// ============================================
// REPLACE FILE — zastąp plik w repo
// ============================================
async function handleReplaceFile(req, res, headers, repo) {
    const { filePath, content, message } = req.body || {};
    if (!filePath || !content) {
        return res.status(400).json({ error: 'Brak filePath lub content' });
    }
    const info = await getFileInfo(headers, repo, filePath);
    const fileResult = await saveFile(headers, repo, filePath, content,
        message || 'Admin zastąpił plik: ' + filePath, info.sha);
    if (!fileResult.success) {
        return res.status(500).json({ error: 'Błąd zapisu pliku (HTTP ' + fileResult.status + ')' });
    }
    return res.status(200).json({ success: true, fileUrl: `${GITHUB_RAW}/${repo}/main/${filePath}` });
}
