<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouveau versement reçu - TakaPay Admin</title>
    <style>
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f7f1e8;
            color: #211d1b;
            margin: 0;
            padding: 24px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 8px 24px -4px rgba(198, 40, 40, 0.08), 0 2px 6px -1px rgba(33, 29, 27, 0.04);
            border: 1px solid #e9e1d7;
        }
        .header {
            background: #211d1b;
            border-bottom: 4px solid #c62828;
            padding: 34px 24px 28px;
            text-align: center;
            color: #ffffff;
        }
        .admin-badge {
            display: inline-block;
            background: rgba(198, 40, 40, 0.25);
            border: 1px solid rgba(198, 40, 40, 0.5);
            color: #ff8a80;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding: 4px 12px;
            border-radius: 9999px;
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0 0 6px 0;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
        }
        .header h1 span {
            color: #ffc928;
        }
        .header p {
            margin: 0;
            font-size: 14px;
            color: #d6cfc7;
        }
        .content {
            padding: 32px 28px;
            background: #fffdf8;
        }
        .status-pill {
            display: inline-flex;
            align-items: center;
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 22px;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #c62828;
            margin-right: 8px;
        }
        .info-box {
            background: #ffffff;
            border-radius: 14px;
            padding: 22px;
            margin: 20px 0;
            border: 1px solid #e9e1d7;
            box-shadow: 0 2px 4px rgba(33, 29, 27, 0.02);
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f2ebe2;
            font-size: 14px;
        }
        .info-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .info-row:first-child {
            padding-top: 0;
        }
        .info-label {
            color: #706966;
        }
        .info-value {
            font-weight: 700;
            color: #211d1b;
            text-align: right;
        }
        .amount-highlight {
            color: #c62828;
            font-size: 18px;
            font-weight: 800;
        }
        .footer {
            background: #f7f1e8;
            padding: 22px;
            text-align: center;
            font-size: 12px;
            color: #706966;
            border-top: 1px solid #e9e1d7;
        }
        .footer strong {
            color: #c62828;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="admin-badge">Notification Marchand</span>
            <h1>Taka<span>Pay</span> Admin</h1>
            <p>Nouveau versement client encaissé</p>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <span class="status-pill">
                    <span class="status-dot"></span>
                    Nouveau paiement encaissé via FeexPay
                </span>
            </div>
            
            <p style="font-size: 15px; margin-top: 0; color: #211d1b; line-height: 1.5;">
                Un client vient d'effectuer un versement sur la plateforme <strong>TakaPay</strong> :
            </p>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Client :</span>
                    <span class="info-value">{{ ($user->prenom ?? '') . ' ' . ($user->nom ?? 'Inconnu') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Téléphone :</span>
                    <span class="info-value">{{ $user->telephone ?? 'Non renseigné' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email :</span>
                    <span class="info-value">{{ $user->email ?? 'Non renseigné' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Montant encaissé :</span>
                    <span class="info-value amount-highlight">{{ number_format($montant, 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Opérateur :</span>
                    <span class="info-value">{{ $network }} (Mobile Money)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Réf. Commande :</span>
                    <span class="info-value">{{ $commande->reference }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ID FeexPay :</span>
                    <span class="info-value" style="font-family: monospace; font-size: 12px;">{{ $transactionId }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date :</span>
                    <span class="info-value">{{ now()->format('d/m/Y à H:i:s') }}</span>
                </div>
            </div>

            <p style="font-size: 13px; color: #706966; line-height: 1.5; margin-top: 20px;">
                La commande a été marquée comme validée et la transaction est visible dans votre tableau de bord administrateur TakaPay.
            </p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} <strong>TakaPay Administration</strong>.</p>
            <p>Notification automatique de paiement.</p>
        </div>
    </div>
</body>
</html>
