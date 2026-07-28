// ============================================
// Forum API — Vercel Serverless Function
// ============================================
// Wymagane zmienne środowiskowe w Vercel:
//   GITHUB_TOKEN  — Personal Access Token (classic) z zakresem 'public_repo'
//   GITHUB_REPO   — np. 'PiotrKowalski/materia-dowodowa'
// ============================================

const GITHUB_API = 'https://api.github.com';
const FILE_PATH = 'forum/topics.json';

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
        return res.status(500).json({ error: 'Brak konfiguracji GITHUB_TOKEN lub GITHUB_REPO w zmiennych środowiskowych Vercel.' });
    }

    const headers = {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    try {
        // GET — pobierz tematy
        if (req.method === 'GET') {
            return await handleGet(req, res, headers, repo);
        }

        // POST — akcje
        if (req.method === 'POST') {
            return await handlePost(req, res, headers, repo);
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        return res.status(500).json({ error: err.message || 'Błąd serwera' });
    }
}

// ============================================
// GET — odczytaj forum/topics.json z GitHub
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
    // GitHub API zwraca content zakodowany base64
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));

    return res.status(200).json(content);
}

// ============================================
// POST — akcje: create, delete, reply
// ============================================
async function handlePost(req, res, headers, repo) {
    const action = req.query.action || req.body?.action;

    if (!action) {
        return res.status(400).json({ error: 'Brak parametru action (create/delete/reply)' });
    }

    // Najpierw pobierz obecny plik (żeby dostać SHA)
    const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${FILE_PATH}`;
    const getResp = await fetch(fileUrl, { headers });
    let sha = null;
    let topics = [];

    if (getResp.ok) {
        const fileData = await getResp.json();
        sha = fileData.sha;
        topics = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    }

    // Upewnij się, że topics to tablica
    if (!Array.isArray(topics)) topics = [];

    switch (action) {
        case 'create':
            return await handleCreate(req, res, headers, repo, topics, sha, fileUrl);
        case 'delete':
            return await handleDelete(req, res, headers, repo, topics, sha, fileUrl);
        case 'reply':
            return await handleReply(req, res, headers, repo, topics, sha, fileUrl);
        default:
            return res.status(400).json({ error: 'Nieznana akcja: ' + action });
    }
}

// ============================================
// CREATE — nowy temat
// ============================================
async function handleCreate(req, res, headers, repo, topics, sha, fileUrl) {
    const { title, content } = req.body || {};
    if (!title || !content) {
        return res.status(400).json({ error: 'Tytuł i treść są wymagane' });
    }

    // Generuj kod usuwania (bez '0', 'O', '1', 'I' — żeby uniknąć pomyłek)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let deleteCode = '';
    for (let i = 0; i < 8; i++) {
        deleteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newTopic = {
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        replies: [],
        privateCode: deleteCode
    };

    topics.unshift(newTopic);

    // Zapisz do GitHub
    const commitResult = await commitFile(headers, fileUrl, topics, sha, 'Dodano temat: ' + title.trim());

    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu do GitHub' });
    }

    return res.status(201).json({
        success: true,
        id: 0, // indeks w tablicy (0, bo unshift)
        deleteCode: deleteCode,
        topic: newTopic
    });
}

// ============================================
// DELETE — usuń temat lub odpowiedź
// ============================================
async function handleDelete(req, res, headers, repo, topics, sha, fileUrl) {
    const { topicIdx, replyIdx, code } = req.body || {};

    if (topicIdx === undefined || topicIdx === null) {
        return res.status(400).json({ error: 'Brak topicIdx' });
    }

    const idx = parseInt(topicIdx);
    if (idx < 0 || idx >= topics.length) {
        return res.status(404).json({ error: 'Nie znaleziono tematu' });
    }

    const topic = topics[idx];

    // Weryfikacja kodu
    if (replyIdx === undefined || replyIdx === null) {
        // Usuwanie tematu
        if (topic.privateCode && code !== topic.privateCode) {
            return res.status(403).json({ error: 'Nieprawidłowy kod usuwania' });
        }
        topics.splice(idx, 1);
    } else {
        // Usuwanie odpowiedzi
        const rIdx = parseInt(replyIdx);
        if (!topic.replies || rIdx < 0 || rIdx >= topic.replies.length) {
            return res.status(404).json({ error: 'Nie znaleziono odpowiedzi' });
        }
        // Dla odpowiedzi też sprawdź kod tematu
        if (topic.privateCode && code !== topic.privateCode) {
            return res.status(403).json({ error: 'Nieprawidłowy kod usuwania' });
        }
        topic.replies.splice(rIdx, 1);
    }

    const commitResult = await commitFile(headers, fileUrl, topics, sha, 'Usunięto wpis na forum');

    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu do GitHub' });
    }

    return res.status(200).json({ success: true });
}

// ============================================
// REPLY — dodaj odpowiedź
// ============================================
async function handleReply(req, res, headers, repo, topics, sha, fileUrl) {
    const { topicIdx, content } = req.body || {};

    if (topicIdx === undefined || topicIdx === null) {
        return res.status(400).json({ error: 'Brak topicIdx' });
    }
    if (!content) {
        return res.status(400).json({ error: 'Treść odpowiedzi jest wymagana' });
    }

    const idx = parseInt(topicIdx);
    if (idx < 0 || idx >= topics.length) {
        return res.status(404).json({ error: 'Nie znaleziono tematu' });
    }

    if (!topics[idx].replies) topics[idx].replies = [];

    topics[idx].replies.push({
        content: content.trim(),
        createdAt: new Date().toISOString()
    });

    const commitResult = await commitFile(headers, fileUrl, topics, sha, 'Dodano odpowiedź w temacie: ' + topics[idx].title);

    if (!commitResult.success) {
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu do GitHub' });
    }

    return res.status(201).json({ success: true });
}

// ============================================
// Pomocnik: commit pliku do GitHub
// ============================================
async function commitFile(headers, fileUrl, topics, sha, message) {
    const content = Buffer.from(JSON.stringify(topics, null, 2)).toString('base64');

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
