// ============================================
// Admin API — Vercel Serverless Function
// ============================================
// Ukryte narzędzie do dodawania oficjalnych spraw i generatorów.
// Wymaga hasła ADMIN_PASSWORD (zmienna env w Vercel).
// ============================================

const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';
const MANIFEST_PATH = 'admin/contents.json';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

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
            return await handleGet(req, res, headers, repo);
        }
        if (req.method === 'POST') {
            return await handlePost(req, res, headers, repo, adminPassword);
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Błąd serwera' });
    }
}

async function handleGet(req, res, headers, repo) {
    const url = `${GITHUB_API}/repos/${repo}/contents/${MANIFEST_PATH}`;
    const response = await fetch(url, { headers });

    if (response.status === 404) {
        return res.status(200).json({ cases: [], generators: [] });
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.message || 'Błąd odczytu GitHub' });
    }

    const data = await response.json();
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    return res.status(200).json(content);
}

async function handlePost(req, res, headers, repo, adminPassword) {
    const { password, action, contentType } = req.body || {};

    // Weryfikacja hasła
    if (password !== adminPassword) {
        return res.status(403).json({ error: 'Nieprawidłowe hasło administratora.' });
    }

    const manifestUrl = `${GITHUB_API}/repos/${repo}/contents/${MANIFEST_PATH}`;
    const getResp = await fetch(manifestUrl, { headers });
    let sha = null;
    let manifest = { cases: [], generators: [] };

    if (getResp.ok) {
        const fileData = await getResp.json();
        sha = fileData.sha;
        manifest = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    }

    if (!manifest.cases) manifest.cases = [];
    if (!manifest.generators) manifest.generators = [];

    switch (action) {
        case 'addCase':
            return await handleAddCase(req, res, headers, repo, manifest, sha, manifestUrl);
        case 'addGenerator':
            return await handleAddGenerator(req, res, headers, repo, manifest, sha, manifestUrl);
        case 'deleteItem':
            return await handleDeleteItem(req, res, headers, repo, manifest, sha, manifestUrl);
        default:
            return res.status(400).json({ error: 'Nieznana akcja: ' + action });
    }
}

async function handleAddCase(req, res, headers, repo, manifest, sha, manifestUrl) {
    const { title, sygnatura, desc, htmlContent, password } = req.body || {};

    if (!title || !htmlContent) {
        return res.status(400).json({ error: 'Tytuł i zawartość HTML są wymagane' });
    }

    // Generuj unikalne ID pliku
    const fileId = 'sprawa-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const fileName = fileId + '.html';
    const repoFilePath = `sprawy/${fileName}`;

    // Zapisz plik HTML w repo
    const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${repoFilePath}`;
    const fileBody = {
        message: `Dodano oficjalną sprawę: ${title.trim()} (${new Date().toLocaleString('pl-PL')})`,
        content: Buffer.from(htmlContent).toString('base64'),
        branch: 'main'
    };

    let fileSaved = false;
    try {
        const fileResp = await fetch(fileUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(fileBody)
        });
        fileSaved = fileResp.ok;
        if (!fileSaved) {
            const err = await fileResp.json().catch(() => ({}));
            return res.status(500).json({ error: 'Błąd zapisu pliku: ' + (err.message || fileResp.status) });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Błąd sieci przy zapisie pliku: ' + err.message });
    }

    // Dodaj do manifestu
    const rawUrl = `${GITHUB_RAW}/${repo}/main/${repoFilePath}`;
    const newEntry = {
        id: fileId,
        title: title.trim(),
        sygnatura: sygnatura || '',
        desc: desc || '',
        fileName: fileName,
        filePath: repoFilePath,
        fileUrl: rawUrl,
        createdAt: new Date().toISOString()
    };

    manifest.cases.unshift(newEntry);

    // Zapisz manifest
    const commitResult = await commitFile(headers, manifestUrl, manifest, sha, 'Dodano sprawę: ' + title.trim());

    if (!commitResult.success) {
        // Rollback: usuń plik
        try {
            const delResp = await fetch(fileUrl, { headers });
            if (delResp.ok) {
                const delData = await delResp.json();
                await fetch(fileUrl, {
                    method: 'DELETE',
                    headers: headers,
                    body: JSON.stringify({
                        message: 'Rollback: usunięcie pliku sprawy',
                        sha: delData.sha,
                        branch: 'main'
                    })
                });
            }
        } catch(e) {}
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    }

    return res.status(201).json({
        success: true,
        entry: newEntry
    });
}

async function handleAddGenerator(req, res, headers, repo, manifest, sha, manifestUrl) {
    const { title, desc, htmlContent, password } = req.body || {};

    if (!title || !htmlContent) {
        return res.status(400).json({ error: 'Tytuł i zawartość HTML są wymagane' });
    }

    const fileId = 'gen-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const fileName = fileId + '.html';
    const repoFilePath = `generatory/${fileName}`;

    // Zapisz plik HTML w repo
    const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${repoFilePath}`;
    const fileBody = {
        message: `Dodano generator: ${title.trim()} (${new Date().toLocaleString('pl-PL')})`,
        content: Buffer.from(htmlContent).toString('base64'),
        branch: 'main'
    };

    try {
        const fileResp = await fetch(fileUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(fileBody)
        });
        if (!fileResp.ok) {
            const err = await fileResp.json().catch(() => ({}));
            return res.status(500).json({ error: 'Błąd zapisu pliku: ' + (err.message || fileResp.status) });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Błąd sieci: ' + err.message });
    }

    // Dodaj do manifestu
    const rawUrl = `${GITHUB_RAW}/${repo}/main/${repoFilePath}`;
    const newEntry = {
        id: fileId,
        title: title.trim(),
        desc: desc || '',
        fileName: fileName,
        filePath: repoFilePath,
        fileUrl: rawUrl,
        createdAt: new Date().toISOString()
    };

    manifest.generators.unshift(newEntry);

    const commitResult = await commitFile(headers, manifestUrl, manifest, sha, 'Dodano generator: ' + title.trim());

    if (!commitResult.success) {
        try {
            const delResp = await fetch(fileUrl, { headers });
            if (delResp.ok) {
                const delData = await delResp.json();
                await fetch(fileUrl, {
                    method: 'DELETE',
                    headers: headers,
                    body: JSON.stringify({
                        message: 'Rollback: usunięcie pliku generatora',
                        sha: delData.sha,
                        branch: 'main'
                    })
                });
            }
        } catch(e) {}
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    }

    return res.status(201).json({
        success: true,
        entry: newEntry
    });
}

async function handleDeleteItem(req, res, headers, repo, manifest, sha, manifestUrl) {
    const { contentType, itemId, password } = req.body || {};

    if (!contentType || !itemId) {
        return res.status(400).json({ error: 'Brak contentType lub itemId' });
    }

    const list = contentType === 'case' ? manifest.cases : manifest.generators;
    const idx = list.findIndex(item => item.id === itemId);

    if (idx === -1) {
        return res.status(404).json({ error: 'Nie znaleziono wpisu' });
    }

    const item = list[idx];
    const repoFilePath = item.filePath;

    // Usuń plik z repo
    if (repoFilePath) {
        const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${repoFilePath}`;
        try {
            const getResp = await fetch(fileUrl, { headers });
            if (getResp.ok) {
                const fileData = await getResp.json();
                await fetch(fileUrl, {
                    method: 'DELETE',
                    headers: headers,
                    body: JSON.stringify({
                        message: `Usunięto: ${item.title} (${new Date().toLocaleString('pl-PL')})`,
                        sha: fileData.sha,
                        branch: 'main'
                    })
                });
            }
        } catch(e) {}
    }

    list.splice(idx, 1);

    const commitResult = await commitFile(headers, manifestUrl, manifest, sha, 'Usunięto: ' + item.title);

    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    }

    return res.status(200).json({ success: true });
}

async function commitFile(headers, fileUrl, data, sha, message) {
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const body = {
        message: message + ' (' + new Date().toLocaleString('pl-PL') + ')',
        content: content,
        branch: 'main'
    };
    if (sha) body.sha = sha;

    try {
        const resp = await fetch(fileUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(body)
        });
        if (resp.ok) return { success: true };
        const err = await resp.json().catch(() => ({}));
        return { success: false, error: err.message || 'HTTP ' + resp.status };
    } catch (err) {
        return { success: false, error: err.message || 'Błąd sieci' };
    }
}
