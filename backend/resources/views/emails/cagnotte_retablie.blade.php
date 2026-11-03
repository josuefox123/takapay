<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ !empty($isAdmin) ? 'Cagnotte rétablie par le client - TakaPay Admin' : 'Cagnotte rétablie avec succès - TakaPay' }}</title>
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
            box-shadow: 0 8px 24px -4px rgba(5, 150, 105, 0.08), 0 2px 6px -1px rgba(33, 29, 27, 0.04);
            border: 1px solid #e9e1d7;
        }
        .header {
            background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
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
            background: #ecfdf5;
            border: 1.5px solid #a7f3d0;
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 24px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        .alert-box-text {
            font-size: 14px;
            color: #065f46;
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
            background: #f0fdf4;
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
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #dcfce7;
            color: #166534;
            padding: 4px 10px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 13px;
        }
        .btn-action {
            display: inline-block;
            background: #f97316;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 14.5px;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 12px;
            text-align: center;
            margin-top: 10px;
            box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3);
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
            color: #059669;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header" @if(!empty($isAdmin)) style="background: #211d1b; border-bottom: 4px solid #059669;" @endif>
            <div class="brand-badge">
                {{ !empty($isAdmin) ? 'TakaPay Admin · Cagnotte Rétablie' : 'TakaPay · Cagnotte Rétablie' }}
            </div>
            <h1>{{ !empty($isAdmin) ? 'Cagnotte rétablie par le client' : 'Votre cagnotte est de nouveau active !' }}</h1>
            <p>{{ !empty($isAdmin) ? 'La demande d’annulation a été révoquée par le client' : 'Vos cotisations sont intactes et votre projet d’achat continue' }}</p>
        </div>

        <!-- Contenu -->
        <div class="content">
            <div class="greeting">
                @if(!empty($isAdmin))
                    Bonjour l'équipe TakaPay,
                @else
                    Bonjour {{ $user?->prenom ? $user->prenom . ' ' . $user->nom : ($user?->nom ?? 'Cher(e) Client(e)') }},
                @endif
            </div>

            <p class="intro-text">
                @if(!empty($isAdmin))
                    Le client <strong>{{ $user?->prenom ? $user->prenom . ' ' . $user->nom : ($user?->nom ?? 'Client') }}</strong> ({{ $user?->telephone ?? 'Non renseigné' }}) a rétabli sa cagnotte pour l'article <strong>{{ $cagnotte->produit?->nom ?? 'Article TakaPay' }}</strong>. La demande de remboursement a été annulée et le stock du produit a été réajusté.
                @else
                    Nous avons le grand plaisir de vous confirmer que votre cagnotte pour l'article <strong>{{ $cagnotte->produit?->nom ?? 'votre produit' }}</strong> a bien été rétablie avec succès. Votre demande d'annulation est révoquée et votre épargne reprend son cours !
                @endif
            </p>

            <div class="alert-box">
                <p class="alert-box-text">
                    @if(!empty($isAdmin))
                        ℹ️ <strong>Remboursement annulé :</strong> Aucune action de virement Payout n'est requise pour cette cagnotte. Elle réintègre le portefeuille normal des cagnottes actives en attente de versements.
                    @else
                        ✅ <strong>Vos cotisations sont intactes :</strong> Aucun frais de gestion n'a été déduit. L'intégralité de vos <strong>{{ number_format($cagnotte->montant_verse, 0, ',', ' ') }} FCFA</strong> déjà cotisés reste acquise et votre article demeure réservé.
                    @endif
                </p>
            </div>

            <!-- Récapitulatif cagnotte -->
            <div class="card-details">
                <div class="detail-row">
                    <span class="detail-label">Article concerné :</span>
                    <span class="detail-value">{{ $cagnotte->produit?->nom ?? 'Article TakaPay' }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Prix total de l'article :</span>
                    <span class="detail-value">{{ number_format($cagnotte->objectif_effectif, 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="detail-row highlight">
                    <span class="detail-label" style="font-weight: 700; color: #166534;">Montant déjà cotisé :</span>
                    <span class="detail-value" style="font-size: 16px; color: #059669; font-weight: 900;">
                        {{ number_format($cagnotte->montant_verse, 0, ',', ' ') }} FCFA
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Reste à payer :</span>
                    <span class="detail-value" style="color: #f97316;">
                        {{ number_format(max(0, $cagnotte->objectif_effectif - $cagnotte->montant_verse), 0, ',', ' ') }} FCFA
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Progression de l'épargne :</span>
                    <span class="detail-value">{{ $cagnotte->progression }}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Statut de la cagnotte :</span>
                    <span class="detail-value">
                        <span class="status-badge">🟢 En cours (Active)</span>
                    </span>
                </div>
                @if(!empty($isAdmin))
                <div class="detail-row">
                    <span class="detail-label">Numéro du client :</span>
                    <span class="detail-value">{{ $user?->telephone ?? 'Non renseigné' }}</span>
                </div>
                @endif
            </div>

            @if(empty($isAdmin))
            <p class="intro-text" style="font-size: 13.5px; color: #78716c; margin-top: 16px;">
                Vous pouvez à tout moment effectuer un nouveau versement libre via votre espace client TakaPay selon vos disponibilités financières, sans aucun frais caché.
            </p>
            <div style="text-align: center; margin-top: 24px;">
                <a href="{{ config('app.frontend_url', env('APP_URL', 'https://takapay.bj')) }}/mon-compte" class="btn-action">
                    Accéder à ma cagnotte
                </a>
            </div>
            @endif
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <p style="margin: 0 0 6px 0;">
                Des questions sur votre cagnotte ? Notre équipe support est à votre écoute à <a href="mailto:contact@takapay.bj">contact@takapay.bj</a> ou par WhatsApp.
            </p>
            <p style="margin: 0; opacity: 0.8;">
                &copy; {{ date('Y') }} TakaPay Bénin. Tous droits réservés.
            </p>
        </div>
    </div>
</body>
</html>
