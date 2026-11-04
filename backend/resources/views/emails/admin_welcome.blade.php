<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Accès Administrateur - TakaPay</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; color: #1f2937; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; padding: 26px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.95; }
        .content { padding: 28px 24px; }
        .creds-box { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
        .creds-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .creds-label { color: #6b7280; font-weight: 600; }
        .creds-value { font-weight: 700; color: #111827; font-family: monospace; font-size: 15px; }
        .btn { display: inline-block; background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-align: center; margin-top: 10px; }
        .notice { font-size: 12.5px; color: #4b5563; line-height: 1.5; margin-top: 18px; padding: 12px; background: #f3f4f6; border-radius: 8px; }
        .footer { text-align: center; padding: 18px; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>TakaPay Bénin</h1>
            <p>Espace d'Administration & Gestion</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;">Bonjour <strong>{{ $user->prenom ? $user->prenom . ' ' . $user->nom : $user->nom }}</strong>,</p>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">
                @if(!empty($isUpdate))
                    Les informations de votre compte sur la plateforme <strong>TakaPay</strong> viennent d'être mises à jour par le Super Administrateur.
                @else
                    Un compte administrateur vient de vous être créé sur la plateforme <strong>TakaPay</strong> par le Super Administrateur.
                @endif
            </p>

            <div class="creds-box">
                <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #dc2626; margin-bottom: 12px; letter-spacing: 0.5px;">
                    Vos informations de compte
                </div>
                <div class="creds-row">
                    <span class="creds-label">Identifiant / Email :</span>
                    <span class="creds-value">{{ $user->email }}</span>
                </div>
                <div class="creds-row">
                    <span class="creds-label">Rôle :</span>
                    <span class="creds-value">{{ ucfirst(str_replace('_', ' ', $user->role)) }}</span>
                </div>
                <div class="creds-row" style="{{ empty($temporaryPassword) ? 'margin-bottom: 0;' : '' }}">
                    <span class="creds-label">Statut du compte :</span>
                    <span class="creds-value">{{ ucfirst($user->statut_compte ?? 'actif') }}</span>
                </div>
                @if(!empty($temporaryPassword))
                <div class="creds-row" style="margin-bottom: 0;">
                    <span class="creds-label">Mot de passe temporaire :</span>
                    <span class="creds-value" style="color: #dc2626;">{{ $temporaryPassword }}</span>
                </div>
                @endif
            </div>

            <div style="text-align: center; margin: 25px 0 15px;">
                <a href="{{ $loginUrl }}" class="btn">Accéder à TakaPay</a>
            </div>

            @if(!empty($temporaryPassword))
            <div class="notice">
                🔒 <strong>Sécurité obligatoire :</strong> Ce mot de passe est temporaire. Lors de votre prochaine connexion, la plateforme vous invitera automatiquement à définir votre mot de passe personnel sécurisé.
            </div>
            @endif
        </div>
        <div class="footer">
            TakaPay Bénin · Espace réservé à l'équipe d'administration.
        </div>
    </div>
</body>
</html>
