<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation d'annulation de votre cagnotte - TakaPay</title>
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
            box-shadow: 0 8px 24px -4px rgba(220, 38, 38, 0.08), 0 2px 6px -1px rgba(33, 29, 27, 0.04);
            border: 1px solid #e9e1d7;
        }
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
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
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
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
        .greeting {
            font-size: 17px;
            font-weight: 700;
            color: #1c1817;
            margin-bottom: 12px;
        }
        .intro-text {
            font-size: 14.5px;
            line-height: 1.6;
            color: #574e4a;
            margin-bottom: 24px;
        }
        .alert-box {
            background: #fff1f2;
            border: 1.5px solid #fecaca;
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 24px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .alert-box-text {
            font-size: 14px;
            color: #991b1b;
            line-height: 1.5;
            margin: 0;
        }
        .card-details {
            background: #ffffff;
            border: 1px solid #ebd9cb;
            border-radius: 16px;
            padding: 22px;
            margin-bottom: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px dashed #eee3d8;
            font-size: 14px;
        }
        .detail-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .detail-row.highlight {
            background: #fef2f2;
            margin: 8px -12px -4px;
            padding: 12px;
            border-radius: 10px;
            border-bottom: none;
        }
        .detail-label {
            color: #796e68;
            font-weight: 500;
        }
        .detail-value {
            color: #1f1b19;
            font-weight: 700;
            text-align: right;
        }
        .countdown-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #fee2e2;
            color: #dc2626;
            padding: 4px 10px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 13px;
        }
        .footer {
            padding: 24px;
            background: #f7f1e8;
            border-top: 1px solid #ebd9cb;
            text-align: center;
            font-size: 12px;
            color: #8c7e75;
            line-height: 1.6;
        }
        .footer a {
            color: #dc2626;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="brand-badge">TakaPay · Annulation & Remboursement</div>
            <h1>Demande d'annulation prise en compte</h1>
            <p>Votre demande a bien été enregistrée par nos services</p>
        </div>

        <!-- Contenu -->
        <div class="content">
            <div class="greeting">
                Bonjour {{ $user?->prenom ? $user->prenom . ' ' . $user->nom : ($user?->nom ?? 'Cher(e) Client(e)') }},
            </div>

            <p class="intro-text">
                Nous accusons bonne réception de votre demande d'annulation pour votre cagnotte concernant l'article <strong>{{ $cagnotte->produit?->nom ?? 'votre produit' }}</strong>.
            </p>

            <div class="alert-box">
                <p class="alert-box-text">
                    ⏳ <strong>Délai de traitement :</strong> Conformément à nos conditions d'utilisation, votre virement de remboursement vous sera retourné sous un délai maximal de <strong>24 heures</strong> sur votre compte Mobile Money.
                </p>
            </div>

            <!-- Récapitulatif financier -->
            <div class="card-details">
                <div class="detail-row">
                    <span class="detail-label">Article concerné :</span>
                    <span class="detail-value">{{ $cagnotte->produit?->nom ?? 'Article TakaPay' }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Montant total cotisé :</span>
                    <span class="detail-value">{{ number_format($cagnotte->montant_verse, 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Frais de gestion & dossier (5%) :</span>
                    <span class="detail-value" style="color: #dc2626;">- {{ number_format($fraisAnnulation, 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="detail-row highlight">
                    <span class="detail-label" style="font-weight: 700; color: #1c1817;">Montant net remboursé (95%) :</span>
                    <span class="detail-value" style="font-size: 16px; color: #dc2626; font-weight: 900;">
                        {{ number_format($montantRemboursement, 0, ',', ' ') }} FCFA
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Numéro de destination :</span>
                    <span class="detail-value">{{ $telephone }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Délai maximal de réception :</span>
                    <span class="detail-value">
                        <span class="countdown-badge">Moins de 24 Heures</span>
                    </span>
                </div>
            </div>

            <p class="intro-text" style="font-size: 13.5px; color: #78716c; margin-top: 16px;">
                Un SMS ou une notification de confirmation vous sera envoyé dès que le virement aura été validé par notre équipe financière.
            </p>
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <p style="margin: 0 0 6px 0;">
                Besoin d'aide ou d'une question sur votre remboursement ? Contactez notre support client à <a href="mailto:contact@takapay.bj">contact@takapay.bj</a> ou par WhatsApp.
            </p>
            <p style="margin: 0; opacity: 0.8;">
                &copy; {{ date('Y') }} TakaPay Bénin. Tous droits réservés.
            </p>
        </div>
    </div>
</body>
</html>
