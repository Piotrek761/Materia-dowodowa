// ============================================
// Verdicts API — Vercel Serverless Function
// ============================================
// Pliki PDF są zapisywane jako osobne pliki w repo:
//   orzeczenia/files/<id>.pdf
// Manifest (orzeczenia/manifest.json) zawiera tylko metadane.
// ============================================

const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';
const MANIFEST_PATH = 'orzeczenia/manifest.json';

export default async function handler(req, res) {
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

async function handleGet(req, res, headers, repo) {
    const url = `${GITHUB_API}/repos/${repo}/contents/${MANIFEST_PATH}`;
    const response = await fetch(url, { headers });

    if (response.status === 404) {
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

async function handlePost(req, res, headers, repo) {
    const action = req.body?.action || req.query.action;
    if (!action) {
        return res.status(400).json({ error: 'Brak parametru action (create/delete)' });
    }

    const manifestUrl = `${GITHUB_API}/repos/${repo}/contents/${MANIFEST_PATH}`;
    const getResp = await fetch(manifestUrl, { headers });
    let sha = null;
    let verdicts = [];

    if (getResp.ok) {
        const fileData = await getResp.json();
        sha = fileData.sha;
        verdicts = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    }
    if (!Array.isArray(verdicts)) verdicts = [];

    switch (action) {
        case 'create':
            return await handleCreate(req, res, headers, repo, verdicts, sha, manifestUrl);
        case 'delete':
            return await handleDelete(req, res, headers, repo, verdicts, sha, manifestUrl);
        default:
            return res.status(400).json({ error: 'Nieznana akcja: ' + action });
    }
}

async function handleCreate(req, res, headers, repo, verdicts, sha, manifestUrl) {
    const { title, court, desc, presiding, judge, member, fileName, data, size } = req.body || {};

    if (!title || !court || !desc) {
        return res.status(400).json({ error: 'Tytuł, sąd i sentencja są wymagane' });
    }

    // Generuj kod usuwania
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let deleteCode = '';
    for (let i = 0; i < 8; i++) {
        deleteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Unikalne ID
    const verdictId = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    // Dla orzeczeń zawsze PDF (zakładamy, choć obsługujemy HTML też)
    const ext = 'pdf';
    const repoFilePath = `orzeczenia/files/${verdictId}.${ext}`;

    // ============================================
    // 1. Zapisz plik w repo (orzeczenia/files/<id>.pdf)
    // ============================================
    let fileCommitSuccess = false; // zmieni się na true tylko po udanym zapisie

    if (data && data.length > 10) {
        const base64Match = data.match(/^data:[^;]+;base64,(.+)$/);
        const fileContent = base64Match ? base64Match[1] : Buffer.from(data).toString('base64');

        const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${repoFilePath}`;
        const fileBody = {
            message: `Dodano plik orzeczenia: ${title.trim()} (${new Date().toLocaleString('pl-PL')})`,
            content: fileContent,
            branch: 'main'
        };

        try {
            const fileResp = await fetch(fileUrl, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(fileBody)
            });
            fileCommitSuccess = fileResp.ok;
            if (!fileResp.ok) {
                const errData = await fileResp.json().catch(() => ({}));
                console.error('Błąd zapisu pliku orzeczenia:', errData.message || fileResp.status);
            }
        } catch (err) {
            console.error('Błąd sieci przy zapisie pliku orzeczenia:', err.message);
            fileCommitSuccess = false;
        }
    }

    // ============================================
    // 2. Dodaj wpis do manifestu
    // ============================================
    const rawFileUrl = fileCommitSuccess ? `${GITHUB_RAW}/${repo}/main/${repoFilePath}` : '';

    const newVerdict = {
        id: verdictId,
        title: title.trim(),
        court: court.trim(),
        desc: desc.trim(),
        presiding: presiding || '',
        judge: judge || '',
        member: member || '',
        fileName: fileName || `${verdictId}.${ext}`,
        fileUrl: rawFileUrl,
        size: size || 0,
        createdAt: new Date().toISOString(),
        privateCode: deleteCode
    };

    verdicts.unshift(newVerdict);

    const commitResult = await commitFile(headers, manifestUrl, verdicts, sha, 'Dodano orzeczenie: ' + title.trim());

    if (!commitResult.success) {
        // Rollback: usuń plik jeśli manifest się nie zapisał
        if (fileCommitSuccess) {
            try {
                const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${repoFilePath}`;
                const getFileResp = await fetch(fileUrl, { headers });
                if (getFileResp.ok) {
                    const fileData = await getFileResp.json();
                    await fetch(fileUrl, {
                        method: 'DELETE',
                        headers: headers,
                        body: JSON.stringify({
                            message: 'Rollback: usunięcie pliku (błąd manifestu)',
                            sha: fileData.sha,
                            branch: 'main'
                        })
                    });
                }
            } catch(e) {}
        }
        return res.status(500).json({ error: commitResult.error || 'Błąd zapisu manifestu' });
    }

    return res.status(201).json({
        success: true,
        deleteCode: deleteCode,
        fileUrl: rawFileUrl,
        verdict: newVerdict
    });
}

async function handleDelete(req, res, headers, repo, verdicts, sha, manifestUrl) {
    const { idx, code } = req.body || {};

    if (idx === undefined || idx === null) {
        return res.status(400).json({ error: 'Brak idx' });
    }

    const i = parseInt(idx);
    if (i < 0 || i >= verdicts.length) {
        return res.status(404).json({ error: 'Nie znaleziono orzeczenia' });
    }

    const v = verdicts[i];

    if (v.privateCode && code !== v.privateCode) {
        return res.status(403).json({ error: 'Nieprawidłowy kod usuwania' });
    }

    // Usuń plik z repo
    if (v.id) {
        const repoFilePath = `orzeczenia/files/${v.id}.pdf`;
        const fileUrl = `${GITHUB_API}/repos/${repo}/contents/${repoFilePath}`;

        try {
            const getFileResp = await fetch(fileUrl, { headers });
            if (getFileResp.ok) {
                const fileData = await getFileResp.json();
                await fetch(fileUrl, {
                    method: 'DELETE',
                    headers: headers,
                    body: JSON.stringify({
                        message: `Usunięto plik orzeczenia: ${v.title} (${new Date().toLocaleString('pl-PL')})`,
                        sha: fileData.sha,
                        branch: 'main'
                    })
                });
            }
        } catch(e) {}
    }

    verdicts.splice(i, 1);

    const commitResult = await commitFile(headers, manifestUrl, verdicts, sha, 'Usunięto orzeczenie: ' + v.title);

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

        if (resp.ok) {
            return { success: true };
        }

        const err = await resp.json().catch(() => ({}));
        return { success: false, error: err.message || 'HTTP ' + resp.status };
    } catch (err) {
        return { success: false, error: err.message || 'Błąd sieci' };
    }
}
