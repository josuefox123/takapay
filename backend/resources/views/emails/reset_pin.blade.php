<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Réinitialisation de votre code PIN - TakaPay</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; color: #1f2937; margin: 0; padding: 20px; }
        .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
        .header { background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%); color: #ffffff; padding: 26px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 28px 24px; }
        .code-container { text-align: center; margin: 24px 0; padding: 18px; background: #fef2f2; border-radius: 12px; border: 1.5px dashed #f87171; }
        .code-title { font-size: 12px; text-transform: uppercase; color: #991b1b; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 8px; }
        .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #b71c1c; font-family: 'Courier New', Courier, monospace; }
        .notice { font-size: 13px; color: #6b7280; line-height: 1.5; margin-top: 20px; }
        .security-badge { background: #f3f4f6; border-radius: 8px; padding: 12px; font-size: 12px; color: #4b5563; margin-top: 20px; }
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
                Vous avez demandé la réinitialisation de votre code PIN de connexion TakaPay. Voici votre code de vérification temporaire :
            </p>

            <div class="code-container">
                <div class="code-title">Code de vérification (valide 15 minutes)</div>
                <div class="otp-code">{{ $code }}</div>
            </div>

            <p style="font-size: 13.5px; color: #4b5563; line-height: 1.5;">
                Entrez ce code sur la page de réinitialisation pour choisir votre nouveau code PIN à 6 chiffres.
            </p>

            <div class="security-badge">
                🔒 <strong>Règle de sécurité :</strong> Ne partagez jamais ce code. Aucun conseiller TakaPay ne vous demandera ce code secret par téléphone ou message.
            </div>

            <p class="notice">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail. Votre code PIN actuel reste inchangé et sécurisé.
            </p>
        </div>
        <div class="footer">
            Cet e-mail automatique est envoyé par TakaPay Bénin · Épargne & achats en toute confiance.
        </div>
    </div>
</body>
</html>
