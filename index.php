<?php
// Scan for documentation directories containing index.html
$docs = [];
$items = scandir(__DIR__);

foreach ($items as $item) {
    if ($item[0] === '.' || !is_dir(__DIR__ . '/' . $item)) {
        continue;
    }
    $indexPath = __DIR__ . '/' . $item . '/index.html';
    if (file_exists($indexPath)) {
        $title = ucwords(str_replace(['-', '_'], ' ', $item));
        $desc = "Documentation technique et interactive";
        
        // Extract title and description from HTML if available
        $content = file_get_contents($indexPath, false, null, 0, 4096);
        if (preg_match('/<title>(.*?)<\/title>/si', $content, $m)) {
            $title = trim(html_entity_decode($m[1]));
        }
        if (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/si', $content, $m)) {
            $desc = trim(html_entity_decode($m[1]));
        }

        $docs[] = [
            'slug' => $item,
            'title' => $title,
            'description' => $desc,
            'url' => '/' . rawurlencode($item) . '/'
        ];
    }
}
?>
<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Docs Hub — Portail de Documentation</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #07090e;
            color: #d1d5db;
        }
        .font-retro {
            font-family: 'Orbitron', sans-serif;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col bg-[#07090e] text-slate-200 selection:bg-cyan-500 selection:text-black">
    <!-- Header -->
    <header class="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="text-2xl">🎮</span>
                <div>
                    <h1 class="text-xl font-bold font-retro tracking-wide bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                        Game Docs Hub
                    </h1>
                    <p class="text-xs text-slate-400">Portail local de documentation de jeux</p>
                </div>
            </div>
            <div class="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-400 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>localhost:8000</span>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div class="mb-10">
            <h2 class="text-3xl font-extrabold text-white mb-2">Documentations disponibles</h2>
            <p class="text-slate-400">Sélectionnez un projet pour consulter sa documentation technique et interactive.</p>
        </div>

        <?php if (empty($docs)): ?>
            <div class="p-8 rounded-xl border border-dashed border-slate-800 text-center text-slate-400">
                <p>Aucune documentation trouvée avec un fichier <code class="text-cyan-400">index.html</code>.</p>
            </div>
        <?php else: ?>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <?php foreach ($docs as $doc): ?>
                    <a href="<?= htmlspecialchars($doc['url']) ?>" 
                       class="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <span class="text-xs font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-md">
                                    <?= htmlspecialchars($doc['slug']) ?>
                                </span>
                                <span class="text-slate-500 group-hover:text-cyan-400 transition-colors">➔</span>
                            </div>
                            <h3 class="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-3">
                                <?= htmlspecialchars($doc['title']) ?>
                            </h3>
                            <p class="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                                <?= htmlspecialchars($doc['description']) ?>
                            </p>
                        </div>
                        <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                            <span>Ouvrir la documentation</span>
                            <span class="font-mono text-cyan-400 font-semibold">Consulter &rarr;</span>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Lancé avec <code class="text-slate-400">composer run serve</code> • PHP <?= PHP_VERSION ?></p>
    </footer>
</body>
</html>
