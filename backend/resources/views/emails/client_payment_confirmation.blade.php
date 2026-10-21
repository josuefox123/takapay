<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de votre versement - TakaPay</title>
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
            background: linear-gradient(135deg, #c62828 0%, #a91f24 50%, #7e1c20 100%);
            padding: 36px 24px 30px;
            text-align: center;
            color: #ffffff;
            position: relative;
        }
        .brand-badge {
            display: inline-block;
            background: rgba(255, 201, 40, 0.2);
            border: 1px solid rgba(255, 201, 40, 0.4);
            color: #ffc928;
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
            font-size: 28px;
            font-weight: 900;
            letter-spacing: -0.5px;
        }
        .header h1 span {
            color: #ffc928;
        }
        .header p {
            margin: 0;
            font-size: 15px;
            color: rgba(255, 255, 255, 0.9);
        }
        .content {
            padding: 32px 28px;
            background: #fffdf8;
        }
        .status-pill {
            display: inline-flex;
            align-items: center;
            background: #fef3c7;
            border: 1px solid #fde68a;
            color: #854d0e;
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
        .progress-box {
            background: #ffffff;
            border: 1px solid #e9e1d7;
            border-radius: 14px;
            padding: 20px;
            margin: 22px 0;
            text-align: center;
        }
        .progress-header {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: 700;
            color: #211d1b;
            margin-bottom: 10px;
        }
        .progress-bar-bg {
            background: #f7f1e8;
            height: 12px;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #e9e1d7;
        }
        .progress-bar-fill {
            background: linear-gradient(90deg, #c62828 0%, #ffc928 100%);
            height: 100%;
            border-radius: 6px;
        }
        .progress-note {
            font-size: 12px;
            color: #706966;
            margin-top: 8px;
            margin-bottom: 0;
        }
        .footer {
            background: #f7f1e8;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #706966;
            border-top: 1px solid #e9e1d7;
        }
        .footer p {
            margin: 4px 0;
        }
        .footer strong {
            color: #c62828;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="brand-badge">Paiement Sécurisé</span>
            <h1>Taka<span>Pay</span></h1>
            <p>Confirmation de versement</p>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <span class="status-pill">
                    <span class="status-dot"></span>
                    Versement validé avec succès
                </span>
            </div>
            
            <p style="font-size: 16px; margin-top: 0; line-height: 1.5;">
                Bonjour <strong>{{ $user->prenom ?? $user->nom ?? 'Cher Client' }}</strong>,
            </p>
            <p style="font-size: 14px; color: #706966; line-height: 1.6; margin-bottom: 20px;">
                Votre versement a été validé et crédité sur votre compte <strong>TakaPay</strong>. Voici le récapitulatif de votre opération :
            </p>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Référence commande :</span>
                    <span class="info-value">{{ $commande->reference }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Montant versé :</span>
                    <span class="info-value amount-highlight">{{ number_format($montant, 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Moyen de règlement :</span>
                    <span class="info-value">{{ $network }} (Mobile Money)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ID Transaction :</span>
                    <span class="info-value" style="font-family: monospace; font-size: 12px;">{{ $transactionId }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date :</span>
                    <span class="info-value">{{ now()->format('d/m/Y à H:i') }}</span>
                </div>
            </div>

            @if($cagnotte)
                @php
                    $pct = $cagnotte->prix_unitaire > 0 ? min(100, round(($cagnotte->montant_verse / $cagnotte->prix_unitaire) * 100)) : 100;
                @endphp
                <div class="progress-box">
                    <div class="progress-header">
                        <span>Progression de votre cagnotte</span>
                        <span style="color: #c62828;">{{ number_format($cagnotte->montant_verse, 0, ',', ' ') }} / {{ number_format($cagnotte->prix_unitaire, 0, ',', ' ') }} FCFA</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: {{ $pct }}%;"></div>
                    </div>
                    <p class="progress-note">
                        Vous avez financé <strong>{{ $pct }}%</strong> de votre article ! Continuez à votre rythme.
                    </p>
                </div>
            @endif

            <p style="font-size: 13px; color: #706966; line-height: 1.5; margin-top: 24px; text-align: center;">
                Consultez l'évolution de vos versements à tout moment depuis votre tableau de bord TakaPay.
            </p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} <strong>TakaPay Bénin</strong>. Tous droits réservés.</p>
            <p>Achetez à votre rythme, payez en toute sérénité.</p>
        </div>
    </div>
</body>
</html>
