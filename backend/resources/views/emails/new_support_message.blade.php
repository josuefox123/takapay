<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Nouveau message client - TakaPay</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; color: #1f2937; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
        .header { background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%); color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .content { padding: 24px; }
        .msg-box { background: #f9fafb; border-left: 4px solid #c62828; padding: 14px 18px; border-radius: 6px; margin: 16px 0; font-style: italic; color: #374151; white-space: pre-wrap; word-break: break-word; }
        .info-row { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
        .btn { display: inline-block; background: #c62828; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; text-align: center; }
        .footer { text-align: center; padding: 16px; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>Support Clientèle TakaPay</h1>
        </div>
        <div class="content">
            <p>Bonjour,</p>
            <p>Un nouveau message a été reçu sur le chat d'assistance client :</p>
            
            <div class="info-row"><strong>Expéditeur :</strong> {{ $senderName ?? 'Visiteur #' . $conversation->id }}</div>
            <div class="info-row"><strong>Date / Heure :</strong> {{ $supportMessage->created_at->format('d/m/Y H:i') }}</div>
            
            <div class="msg-box">
                {{ $supportMessage->message }}
            </div>

            <p style="text-align: center;">
                <a href="{{ config('app.url') }}/admin/dashboard" class="btn">Répondre depuis le Dashboard Admin</a>
            </p>
        </div>
        <div class="footer">
            Cet e-mail est généré automatiquement par la plateforme TakaPay.
        </div>
    </div>
</body>
</html>
