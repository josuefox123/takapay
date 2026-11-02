<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $nom }} — Takapay Bénin</title>
    
    <!-- Balises Open Graph pour WhatsApp, Facebook, LinkedIn, etc. -->
    <meta property="og:site_name" content="Takapay" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="{{ $nom }}" />
    <meta property="og:description" content="{{ $description }}" />
    @if(!empty($imageUrl))
    <meta property="og:image" content="{{ $imageUrl }}" />
    <meta property="og:image:secure_url" content="{{ $imageUrl }}" />
    <meta property="og:image:alt" content="{{ $nom }}" />
    @endif
    <meta property="og:url" content="{{ $canonicalUrl }}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{{ $nom }}" />
    <meta name="twitter:description" content="{{ $description }}" />
    @if(!empty($imageUrl))
    <meta name="twitter:image" content="{{ $imageUrl }}" />
    @endif

    <!-- Redirection automatique instantanée des visiteurs vers l'application frontend -->
    <meta http-equiv="refresh" content="0;url={{ $frontendUrl }}" />
    <script>
        window.location.replace("{{ $frontendUrl }}");
    </script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #fffdf8;
            color: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .card {
            background: #ffffff;
            border-radius: 16px;
            padding: 32px 24px;
            max-width: 420px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            border: 1px solid #f1f5f9;
        }
        .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: #c62828;
            color: #ffffff;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="card">
        @if(!empty($imageUrl))
            <img src="{{ $imageUrl }}" alt="{{ $nom }}" style="max-width: 140px; border-radius: 10px; margin-bottom: 16px; object-fit: contain;">
        @endif
        <h1 style="font-size: 1.15rem; margin: 0 0 10px; font-weight: 800;">{{ $nom }}</h1>
        <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 16px;">Redirection vers l'article sur Takapay...</p>
        <a href="{{ $frontendUrl }}" class="btn">Voir l'article sur Takapay →</a>
    </div>
</body>
</html>
