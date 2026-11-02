<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre cagnotte est prête - TakaPay</title>
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
            background: linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%);
            padding: 36px 24px 30px;
            text-align: center;
            color: #ffffff;
            position: relative;
        }
        .brand-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.4);
            color: #ffffff;
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
            color: #fef08a;
        }
        .header p {
            margin: 0;
            font-size: 15px;
            color: rgba(255, 255, 255, 0.95);
        }
        .content {
            padding: 32px 28px;
            background: #fffdf8;
        }
        .success-pill {
            display: inline-flex;
            align-items: center;
            background: #dcfce7;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 7px 16px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 800;
            margin-bottom: 22px;
        }
        .success-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #16a34a;
            margin-right: 8px;
        }
        .callout-box {
            background: #f0fdf4;
            border: 1.5px solid #86efac;
            border-radius: 14px;
            padding: 20px;
            margin: 22px 0;
            text-align: left;
        }
        .callout-title {
            color: #15803d;
            font-weight: 800;
            font-size: 16px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .callout-text {
            color: #166534;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
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
            color: #16a34a;
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
            height: 14px;
            border-radius: 7px;
            overflow: hidden;
            border: 1px solid #e9e1d7;
        }
        .progress-bar-fill {
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
            height: 100%;
            border-radius: 7px;
        }
        .footer {
            background: #f7f1e8;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #8c837f;
            border-top: 1px solid #e9e1d7;
        }
        .footer p {
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="brand-badge">Objectif Atteint 100%</span>
            <h1>Taka<span>Pay</span></h1>
            <p>🎉 Félicitations ! Votre cagnotte est prête</p>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <span class="success-pill">
                    <span class="success-dot"></span>
                    Cotisation 100% terminée
                </span>
            </div>

            <p style="font-size: 16px; margin-top: 0; line-height: 1.5;">
                Bonjour <strong>{{ $user->prenom ?? $user->nom ?? 'Cher Client' }}</strong>,
            </p>
            <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 18px;">
                Excellente nouvelle ! Vous avez <strong>terminé la totalité de vos cotisations</strong> pour votre article <strong>{{ $cagnotte->produit?->nom ?? 'commandé sur TakaPay' }}</strong>. Votre cagnotte est désormais <strong>prête et validée à 100%</strong>.
            </p>

            <div class="callout-box">
                <div class="callout-title">
                    📞 Prochaine étape : Contact sous 24h
                </div>
                <p class="callout-text">
                    Notre équipe logistique et service client <strong>va vous contacter dans moins de 24 heures</strong> pour confirmer votre adresse et planifier la livraison ou remise de votre article en toute sécurité.
                </p>
            </div>

            <div class="progress-box">
                <div class="progress-header">
                    <span>Financement de l'article</span>
                    <span style="color: #16a34a; font-weight: 800;">100% complété</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: 100%;"></div>
                </div>
            </div>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Article :</span>
                    <span class="info-value">{{ $cagnotte->produit?->nom ?? 'Article TakaPay' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Montant total soldé :</span>
                    <span class="info-value amount-highlight">{{ number_format($cagnotte->montant_verse, 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Statut de la cagnotte :</span>
                    <span class="info-value" style="color: #16a34a;">Prête à livrer</span>
                </div>
                @if($cagnotte->telephone_livraison || $user->telephone)
                <div class="info-row">
                    <span class="info-label">Téléphone de contact :</span>
                    <span class="info-value">{{ $cagnotte->telephone_livraison ?? $user->telephone }}</span>
                </div>
                @endif
                @if($cagnotte->adresse_livraison || $user->adresse)
                <div class="info-row">
                    <span class="info-label">Adresse de livraison :</span>
                    <span class="info-value">{{ $cagnotte->adresse_livraison ?? $user->adresse }}</span>
                </div>
                @endif
                <div class="info-row">
                    <span class="info-label">Date de finalisation :</span>
                    <span class="info-value">{{ now()->format('d/m/Y à H:i') }}</span>
                </div>
            </div>

            <p style="font-size: 13px; color: #706966; line-height: 1.5; margin-top: 24px; text-align: center;">
                Merci de votre confiance et de votre fidélité avec <strong>TakaPay</strong>.<br>
                Restez joignable sur votre numéro de téléphone dans les prochaines heures.
            </p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} <strong>TakaPay Bénin</strong>. Tous droits réservés.</p>
            <p>Achetez à votre rythme, recevez en toute sérénité.</p>
        </div>
    </div>
</body>
</html>
