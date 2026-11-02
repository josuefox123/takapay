<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Code PIN modifié - TakaPay</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; color: #1f2937; margin: 0; padding: 20px; }
        .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
        .header { background: linear-gradient(135deg, #15803d 0%, #166534 100%); color: #ffffff; padding: 26px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 28px 24px; }
        .status-container { text-align: center; margin: 24px 0; padding: 18px; background: #f0fdf4; border-radius: 12px; border: 1.5px solid #86efac; }
        .status-icon { font-size: 32px; margin-bottom: 8px; }
        .status-title { font-size: 16px; font-weight: 700; color: #166534; }
        .notice { font-size: 13px; color: #6b7280; line-height: 1.5; margin-top: 20px; }
        .security-badge { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; font-size: 13px; color: #991b1b; margin-top: 20px; line-height: 1.5; }
        .footer { text-align: center; padding: 18px; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>TakaPay Bénin</h1>
            <p>Sécurité de votre compte client</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;">Bonjour <strong>{{ $user->prenom ?? $user->nom ?? 'Cher client' }}</strong>,</p>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">
                Nous vous confirmons que votre <strong>code PIN de sécurité</strong> vient d'être modifié avec succès.
            </p>

            <div class="status-container">
                <div class="status-icon">✅</div>
                <div class="status-title">Code PIN mis à jour</div>
                <p style="font-size: 13px; color: #374151; margin: 6px 0 0;">Votre nouveau code est désormais actif pour toutes vos transactions et connexions.</p>
            </div>

            <div class="security-badge">
                ⚠️ <strong>Alerte de sécurité :</strong> Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'équipe d'assistance TakaPay pour sécuriser votre compte.
            </div>

            <p class="notice">
                Pour votre sécurité, ne communiquez jamais votre code PIN à une tierce personne.
            </p>
        </div>
        <div class="footer">
            Cet e-mail automatique est envoyé par TakaPay Bénin · Épargne & achats en toute confiance.
        </div>
    </div>
</body>
</html>
