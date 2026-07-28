// ============================================
// Community Cases API — Vercel Serverless Function
// ============================================
// Wymagane zmienne środowiskowe w Vercel:
//   GITHUB_TOKEN  — Personal Access Token (classic) z zakresem 'public_repo'
//   GITHUB_REPO   — np. 'PiotrKowalski/materia-dowodowa'
// ============================================

const GITHUB_API = 'https://api.github.com';
const FILE_PATH = 'spolecznosc/manifest.json';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;

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
            return await handlePost(req, res, headers, repo);
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        return res.status(500).json({ error: err.message || 'Błąd serwera' });
    }
}

// ============================================
// GET — odczytaj spolecznosc/manifest.json
// ============================================
async function handleGet(req, res, headers, repo) {
    const url = `${GITHUB_API}/repos/${repo}/contents/${FILE_PATH}`;
    const response = await fetch(url, { headers });

    if (response.status === 404) {
        // Plik nie istnieje — zwróć pustą tablicę
        return res.status(200).json([]);
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.message || 'Błąd odczytu GitHub' });
    }

    const data = await response.json();
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));

    return res.status(200).json(content);
}

// ============================================
// POST — akcje: create, delete, edit
// ============================================
async function handlePost(req, res, headers, repo) {
    const action = req.body?.action || req.query.action;

    if (!action) {
        return res.status(400).json({ error: 'Brak parametru action (create/delete/edit)' });
    }

    // Pobierz obecny manifest
    const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${FILE_PATH}`;
    const getResp = await fetch(fileUrl, { headers });
    let sha = null;
    let cases = [];

    if (getResp.ok) {
        const fileData = await getResp.json();
        sha = fileData.sha;
        cases = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    }

    if (!Array.isArray(cases)) cases = [];

    switch (action) {
        case 'create':
            return await handleCreate(req, res, headers, repo, cases, sha, fileUrl);
        case 'delete':
            return await handleDelete(req, res, headers, repo, cases, sha, fileUrl);
        case 'edit':
            return await handleEdit(req, res, headers, repo, cases, sha, fileUrl);
        default:
            return res.status(400).json({ error: 'Nieznana akcja: ' + action });
    }
}

// ============================================
// CREATE — dodaj nową sprawę społeczności
// ============================================
async function handleCreate(req, res, headers, repo, cases, sha, fileUrl) {
    const { title, sygnatura, court, type, power, defendant, desc, author, format, fileName, data, size } = req.body || {};

    if (!title || !sygnatura || !court || !desc) {
        return res.status(400).json({ error: 'Tytuł, sygnatura, sąd i opis są wymagane' });
    }

    // Generuj kod usuwania
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let deleteCode = '';
    for (let i = 0; i < 8; i++) {
        deleteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Unikalne ID
    const caseId = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const newCase = {
        id: caseId,
        title: title.trim(),
        sygnatura: sygnatura.trim(),
        court: court.trim(),
        type: type || 'Inna',
        power: power || '',
        defendant: defendant || '',
        desc: desc.trim(),
        author: author || 'Użytkownik społeczności',
        format: format || 'html',
        fileName: fileName || '',
        data: data || '',  // base64 data URL
        size: size || 0,
        createdAt: new Date().toISOString(),
        privateCode: deleteCode
    };

    cases.unshift(newCase);

    const commitResult = await commitFile(headers, fileUrl, cases, sha, 'Dodano sprawę: ' + title.trim());

    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu do GitHub' });
    }

    return res.status(201).json({
        success: true,
        deleteCode: deleteCode,
        caseData: newCase
    });
}

// ============================================
// DELETE — usuń sprawę (wymaga kodu)
// ============================================
async function handleDelete(req, res, headers, repo, cases, sha, fileUrl) {
    const { caseIdx, code } = req.body || {};

    if (caseIdx === undefined || caseIdx === null) {
        return res.status(400).json({ error: 'Brak caseIdx' });
    }

    const idx = parseInt(caseIdx);
    if (idx < 0 || idx >= cases.length) {
        return res.status(404).json({ error: 'Nie znaleziono sprawy' });
    }

    const caseItem = cases[idx];

    // Weryfikacja kodu
    if (caseItem.privateCode && code !== caseItem.privateCode) {
        return res.status(403).json({ error: 'Nieprawidłowy kod usuwania' });
    }

    cases.splice(idx, 1);

    const commitResult = await commitFile(headers, fileUrl, cases, sha, 'Usunięto sprawę społeczności: ' + caseItem.title);

    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu do GitHub' });
    }

    return res.status(200).json({ success: true });
}

// ============================================
// EDIT — edytuj sprawę (wymaga kodu)
// ============================================
async function handleEdit(req, res, headers, repo, cases, sha, fileUrl) {
    const { caseIdx, code, title, sygnatura, court, type, power, defendant, desc, author, data } = req.body || {};

    if (caseIdx === undefined || caseIdx === null) {
        return res.status(400).json({ error: 'Brak caseIdx' });
    }

    const idx = parseInt(caseIdx);
    if (idx < 0 || idx >= cases.length) {
        return res.status(404).json({ error: 'Nie znaleziono sprawy' });
    }

    const caseItem = cases[idx];

    // Weryfikacja kodu
    if (caseItem.privateCode && code !== caseItem.privateCode) {
        return res.status(403).json({ error: 'Nieprawidłowy kod edycji' });
    }

    // Aktualizuj pola (tylko podane)
    if (title) caseItem.title = title.trim();
    if (sygnatura) caseItem.sygnatura = sygnatura.trim();
    if (court) caseItem.court = court.trim();
    if (type) caseItem.type = type;
    if (power !== undefined) caseItem.power = power;
    if (defendant !== undefined) caseItem.defendant = defendant;
    if (desc) caseItem.desc = desc.trim();
    if (author !== undefined) caseItem.author = author || 'Użytkownik społeczności';
    if (data) caseItem.data = data;
    caseItem.modifiedAt = new Date().toISOString();

    const commitResult = await commitFile(headers, fileUrl, cases, sha, 'Edytowano sprawę: ' + caseItem.title);

    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu do GitHub' });
    }

    return res.status(200).json({ success: true, caseData: caseItem });
}

// ============================================
// Pomocnik: commit pliku do GitHub
// ============================================
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

        if (resp.ok) {
            return { success: true };
        }

        const err = await resp.json().catch(() => ({}));
        return { success: false, error: err.message || 'HTTP ' + resp.status };
    } catch (err) {
        return { success: false, error: err.message || 'Błąd sieci' };
    }
}
