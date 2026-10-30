<?php

namespace App\Http\Controllers;

use App\Mail\ClientPaymentConfirmationMail;
use App\Mail\MerchantPaymentNotificationMail;
use App\Models\Cagnotte;
use App\Models\Commande;
use App\Models\CommandeProduit;
use App\Models\Notification;
use App\Models\Produit;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PaymentController extends Controller
{
    /**
     * Crée une commande et fournit les configurations FeexPay au frontend React.
     * Sécurise les prix contre les modifications côté navigateur (anti-tampering).
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'nullable|numeric|min:1',
            'produit_id' => 'nullable|integer',
            'cagnotte_id' => 'nullable|integer',
            'type_paiement' => 'nullable|string|in:cash,cagnotte',
            'quantite' => 'nullable|integer|min:1',
            'moyen_paiement' => 'nullable|string',
            'user_id' => 'nullable',
        ]);

        $user = $request->user('sanctum');
        if (!$user && $request->filled('user_id')) {
            $user = User::find($request->input('user_id'));
        }
        if (!$user && ($request->filled('telephone_livraison') || $request->filled('delivery_phone'))) {
            $phone = preg_replace('/\D/', '', $request->input('telephone_livraison') ?? $request->input('delivery_phone'));
            if (strlen($phone) >= 8) {
                $user = User::where('telephone', 'like', "%{$phone}%")->first();
            }
        }
        if (!$user) {
            $user = User::where('role', 'client')->first() ?? User::first();
        }

        $typePaiement = $request->input('type_paiement', 'cagnotte');
        $cagnotteId = $request->input('cagnotte_id');
        $produitId = $request->input('produit_id');
        $quantite = (int) $request->input('quantite', 1);

        $requestedAmount = (float) $request->input('amount', 0);
        $amount = $requestedAmount;
        $fullProductPrice = $amount;
        $reference = 'CMD_' . time() . '_' . rand(1000, 9999);
        $commande = null;

        // Cas 1 : Versement ultérieur sur une cagnotte existante (ClientCagnotteView)
        if ($cagnotteId) {
            $cagnotte = Cagnotte::with(['produit.parametreProduit.promotion'])->findOrFail($cagnotteId);
            $produit = $cagnotte->produit;
            $param = $produit?->parametreProduit;
            $mode = $param?->mode_paiement ?? 'libre';

            $prixTotal = (float) $cagnotte->prix_unitaire;
            $dejaVerse = (float) $cagnotte->montant_verse;
            $reste = max(0, $prixTotal - $dejaVerse);

            if ($reste <= 0) {
                return response()->json([
                    'message' => 'Cette cagnotte est déjà entièrement soldée.',
                ], 422);
            }

            // Mode échelonné : chaque versement doit respecter au minimum le prix échelonné
            if ($mode === 'echelonne') {
                $prixEchelonne = (float) ($param?->prix_echelonne ?? round($prixTotal / max(1, $produit?->duree ?? 6)));
                if ($prixEchelonne > 0 && $reste >= $prixEchelonne && $requestedAmount < $prixEchelonne) {
                    return response()->json([
                        'message' => 'Pour cette cagnotte échelonnée, chaque versement doit être d’au moins ' . number_format($prixEchelonne, 0, ',', ' ') . ' FCFA.',
                    ], 422);
                }
            }

            $amount = min($requestedAmount, $reste);
            $reference = 'DEP_CAG_' . $cagnotteId . '_' . time() . '_' . rand(100, 999);
        }
        // Cas 2 : Nouvelle commande (Achat au comptant ou Démarrage cagnotte)
        elseif ($produitId) {
            $produit = Produit::with(['parametreProduit.promotion'])->findOrFail($produitId);
            $param = $produit->parametreProduit;

            $promoPct = (float) ($param?->promotion?->pourcentage_promo ?? 0);
            $rawCash = (float) ($param?->prix_cash ?? $param?->prix_total ?? 0);
            $rawTotal = (float) ($param?->prix_total ?? $rawCash);

            $prixCash = $promoPct > 0 ? round($rawCash * (1 - $promoPct / 100)) : $rawCash;
            $prixTotal = $promoPct > 0 ? round($rawTotal * (1 - $promoPct / 100)) : $rawTotal;
            $fullProductPrice = $prixTotal > 0 ? $prixTotal : $prixCash;

            if ($typePaiement === 'cash') {
                // Paiement comptant : le montant est STRICTEMENT imposé par le catalogue et multiplié par la quantité
                $unitCash = $prixCash > 0 ? $prixCash : $fullProductPrice;
                $amount = $unitCash * max(1, $quantite);
                $fullProductPrice = $unitCash;
                $reference = ($request->input('moyen_paiement') === 'livraison' ? 'CMD_COD_' : 'CMD_CASH_') . time() . '_' . rand(1000, 9999);
            } else {
                $quantite = 1;
                // Cagnotte : vérifier le 1er versement plancher
                $prixMinimum = (float) ($param?->prix_minimum ?? round($fullProductPrice * 0.1));
                if ($prixMinimum > 0 && $requestedAmount < $prixMinimum) {
                    return response()->json([
                        'message' => 'Le premier versement minimum pour démarrer cette cagnotte est de ' . number_format($prixMinimum, 0, ',', ' ') . ' FCFA.',
                    ], 422);
                }
                $amount = min($requestedAmount > 0 ? $requestedAmount : $prixMinimum, $fullProductPrice);
                $reference = 'CMD_CAG_' . time() . '_' . rand(1000, 9999);
            }

            $isCod = $request->input('moyen_paiement') === 'livraison';

            if ($user || $isCod) {
                $createdData = DB::transaction(function () use ($user, $reference, $amount, $fullProductPrice, $produitId, $quantite, $isCod, $request, $typePaiement, $produit) {
                    $cmd = null;
                    if ($user) {
                        $cmd = Commande::create([
                            'utilisateur_id' => $user->id,
                            'reference' => $reference,
                            'statut' => 'en_attente',
                            'type_commande' => $typePaiement === 'cash' ? 'cash' : 'libre',
                            'mode_paiement' => $request->input('moyen_paiement') ?? ($isCod ? 'livraison' : 'feexpay'),
                            'statut_reception' => 'non_recu',
                            'adresse_livraison' => $request->input('adresse_livraison') ?? $request->input('delivery_address'),
                            'telephone_livraison' => $request->input('telephone_livraison') ?? $request->input('delivery_phone') ?? $user?->telephone,
                            'note_livraison' => $request->input('note_livraison') ?? $request->input('delivery_note'),
                            'coordonnees_gps' => $request->input('coordonnees_gps') ?? $request->input('delivery_coords'),
                            'prix_total' => $amount,
                        ]);

                        CommandeProduit::create([
                            'commande_id' => $cmd->id,
                            'produit_id' => $produitId,
                            'quantite' => $quantite,
                            'prix_unitaire' => $fullProductPrice,
                            'total' => $fullProductPrice * $quantite,
                        ]);
                    }

                    $cag = null;
                    if ($isCod) {
                        $cag = Cagnotte::create([
                            'utilisateur_id' => $user?->id,
                            'produit_id' => $produitId,
                            'prix_unitaire' => $amount,
                            'montant_verse' => 0.00,
                            'moyen_paiement' => 'livraison',
                            'statut' => 'en_attente',
                            'adresse_livraison' => $request->input('adresse_livraison') ?? $request->input('delivery_address'),
                            'telephone_livraison' => $request->input('telephone_livraison') ?? $request->input('delivery_phone') ?? $user?->telephone,
                            'note_livraison' => $request->input('note_livraison') ?? $request->input('delivery_note'),
                            'coordonnees_gps' => $request->input('coordonnees_gps') ?? $request->input('delivery_coords'),
                        ]);

                        Transaction::create([
                            'commande_id' => $cmd?->id,
                            'cagnotte_id' => $cag->id,
                            'reference_externe' => $reference,
                            'date' => now(),
                            'statut' => 'en_attente',
                            'montant' => $amount,
                            'prestataire' => 'LIVRAISON',
                            'type' => 'paiement_livraison',
                            'moyen_paiement' => 'livraison',
                            'devise' => 'XOF',
                        ]);

                        if ($user) {
                            Notification::create([
                                'utilisateur_id' => $user->id,
                                'cagnotte_id' => $cag->id,
                                'titre' => 'Commande Cash enregistrée',
                                'message' => 'Votre commande pour ' . $produit->nom . ' a bien été enregistrée avec paiement à la livraison (' . number_format($amount, 0, ',', ' ') . ' FCFA). Notre équipe vous contactera sous peu pour convenir de la remise.',
                                'type' => 'cagnotte',
                                'statut' => 'non_lu',
                            ]);
                        }
                    }

                    return ['commande' => $cmd, 'cagnotte' => $cag];
                });

                $commande = $createdData['commande'];
                if ($createdData['cagnotte']) {
                    $cagnotteId = $createdData['cagnotte']->id;
                }
            }
        }

        $isCod = $request->input('moyen_paiement') === 'livraison';

        return response()->json([
            'shop_id' => config('services.feexpay.shop_id'),
            'api_key' => config('services.feexpay.api_key'),
            'mode' => config('services.feexpay.mode', 'SANDBOX'),
            'amount' => $amount,
            'reference' => $reference,
            'commande_id' => $commande?->id,
            'cagnotte_id' => $cagnotteId,
            'type_paiement' => $typePaiement,
            'is_cod' => $isCod,
            'message' => $isCod ? 'La disponibilité de l’article vous sera communiquée par l’équipe en charge dans quelques instants.' : null,
        ]);
    }

    /**
     * Confirmation directe appelée par le client React après le callback FeexPay.
     */
    public function confirmPayment(Request $request): JsonResponse
    {
        $request->validate([
            'reference' => 'required|string',
            'status' => 'required|string',
        ]);

        $reference = $request->input('reference');
        $status = strtolower($request->input('status'));
        $transactionId = $request->input('transaction_id') ?? $reference;
        $amount = (float) $request->input('amount', 0);
        $userId = $request->user('sanctum')?->id ?? $request->input('user_id');
        $network = $request->input('reseau') ?? $request->input('network') ?? 'MOBILE_MONEY';
        $clientEmail = $request->input('client_email') ?? $request->input('email');

        if (in_array($status, ['successful', 'success', 'paid'])) {
            $this->applySuccessfulPayment($reference, $amount, $transactionId, $network, $userId, $clientEmail);
            return response()->json([
                'status' => 'success',
                'message' => 'Paiement confirmé avec succès.',
            ]);
        }

        return response()->json([
            'status' => 'ignored',
            'message' => 'Statut de paiement non validé.',
        ]);
    }

    /**
     * Réception du Webhook officiel envoyé par les serveurs FeexPay.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $data = $request->all();
        Log::info('Webhook FeexPay reçu :', $data);

        $status = strtolower($data['status'] ?? '');
        $reference = $data['reference'] ?? $data['custom_id'] ?? $data['customId'] ?? null;
        $transactionId = $data['transaction_id'] ?? $data['id'] ?? $reference;
        $amount = (float) ($data['amount'] ?? 0);
        $network = $data['reseau'] ?? $data['network'] ?? 'MOBILE_MONEY';
        $clientEmail = $data['email'] ?? null;

        if (!$reference) {
            Log::warning('Webhook FeexPay sans référence valide', $data);
            return response()->json(['status' => 'error', 'message' => 'Référence manquante.'], 400);
        }

        if (in_array($status, ['successful', 'success', 'paid'])) {
            $this->applySuccessfulPayment($reference, $amount, $transactionId, $network, null, $clientEmail);
        } elseif (in_array($status, ['failed', 'cancelled'])) {
            $commande = Commande::where('reference', $reference)->first();
            if ($commande && $commande->statut === 'en_attente') {
                $commande->update(['statut' => 'echouee']);
            }
        }

        return response()->json(['status' => 'success'], 200);
    }

    /**
     * Valide la commande / cagnotte et enregistre la transaction comptable.
     */
    protected function applySuccessfulPayment(string $reference, float $amount, string $transactionId, string $network, ?int $userId = null, ?string $clientEmail = null): void
    {
        $resolvedCommande = null;
        $resolvedCagnotte = null;
        $resolvedUser = null;
        $finalAmount = 0.0;

        DB::transaction(function () use ($reference, $amount, $transactionId, $network, $userId, &$resolvedCommande, &$resolvedCagnotte, &$resolvedUser, &$finalAmount) {
            $isCash = str_starts_with($reference, 'CMD_CASH_');
            $isDeposit = str_starts_with($reference, 'DEP_CAG_');

            // 1. Versement ultérieur sur cagnotte existante
            if ($isDeposit) {
                preg_match('/DEP_CAG_(\d+)_/', $reference, $matches);
                $cagId = !empty($matches[1]) ? (int) $matches[1] : null;
                $cagnotte = $cagId ? Cagnotte::find($cagId) : null;

                if ($cagnotte) {
                    $finalAmount = $amount > 0 ? $amount : 0.0;
                    $cagnotte->increment('montant_verse', $finalAmount);
                    $cagnotte->refresh();
                    if ($cagnotte->montant_verse >= $cagnotte->objectif_effectif) {
                        $cagnotte->update(['statut' => 'terminee']);
                        $cagnotte->sendCagnottePreteNotification($clientEmail);
                    }

                    Transaction::firstOrCreate(
                        ['reference_externe' => $transactionId],
                        [
                            'cagnotte_id' => $cagnotte->id,
                            'date' => now(),
                            'statut' => 'succes',
                            'montant' => $finalAmount,
                            'prestataire' => 'FEEXPAY',
                            'type' => 'versement',
                            'moyen_paiement' => $network,
                            'devise' => 'XOF',
                        ]
                    );

                    $resolvedCagnotte = $cagnotte;
                    $resolvedUser = $userId ? User::find($userId) : null;
                }
                return;
            }

            // 2. Nouvelle commande (Comptant ou Démarrage Cagnotte)
            $commande = Commande::where('reference', $reference)->first();

            if (!$commande && $userId) {
                $commande = Commande::where('utilisateur_id', $userId)
                    ->where('statut', 'en_attente')
                    ->latest()
                    ->first();
            }

            if ($commande) {
                if ($commande->statut !== 'payee') {
                    $commande->update(['statut' => 'payee']);
                }
                $finalAmount = $amount > 0 ? $amount : (float) $commande->prix_total;

                $cagnotteId = null;
                $cmdProduit = $commande->commandeProduits()->first();

                // Création de la cagnotte pour le suivi de la commande chez le client (Comptant ou Échelonné)
                if ($cmdProduit && $cmdProduit->produit_id) {
                    $cagnotte = Cagnotte::create([
                        'utilisateur_id' => $commande->utilisateur_id ?? $userId,
                        'produit_id' => $cmdProduit->produit_id,
                        'prix_unitaire' => $isCash ? (float) $commande->prix_total : (float) $cmdProduit->prix_unitaire,
                        'montant_verse' => $finalAmount,
                        'moyen_paiement' => $network,
                        'statut' => $isCash ? 'terminee' : ($finalAmount >= (float) $cmdProduit->prix_unitaire ? 'terminee' : 'en_cours'),
                    ]);
                    $cagnotteId = $cagnotte->id;
                    $resolvedCagnotte = $cagnotte;
                    if ($cagnotte->statut === 'terminee') {
                        $cagnotte->sendCagnottePreteNotification($clientEmail);
                    }
                }

                Transaction::firstOrCreate(
                    ['reference_externe' => $transactionId],
                    [
                        'commande_id' => $commande->id,
                        'cagnotte_id' => $cagnotteId,
                        'date' => now(),
                        'statut' => 'succes',
                        'montant' => $finalAmount,
                        'prestataire' => 'FEEXPAY',
                        'type' => $isCash ? 'commande_cash' : 'commande_cagnotte',
                        'moyen_paiement' => $network,
                        'devise' => 'XOF',
                    ]
                );

                $resolvedCommande = $commande;
                $resolvedUser = $commande->utilisateur ?? ($userId ? User::find($userId) : null);
            }
        });

        // Enregistrement de la notification interne pour le client
        if ($resolvedUser) {
            try {
                $prodName = $resolvedCagnotte?->produit?->nom ?? 'votre commande';
                $notifTitle = $resolvedCagnotte ? 'Versement validé' : 'Paiement validé';
                $notifMsg = 'Votre paiement de ' . number_format($finalAmount, 0, ',', ' ') . ' FCFA pour ' . $prodName . ' a été validé avec succès (Réf: ' . $transactionId . ').';

                Notification::create([
                    'utilisateur_id' => $resolvedUser->id,
                    'cagnotte_id' => $resolvedCagnotte?->id,
                    'titre' => $notifTitle,
                    'message' => $notifMsg,
                    'type' => 'paiements',
                    'statut' => 'non_lu',
                ]);
            } catch (\Throwable $e) {
                Log::warning('Impossible de créer la notification de paiement : ' . $e->getMessage());
            }
        }

        // Envoi des emails de notification (Client et Marchand)
        if ($resolvedCommande && $resolvedUser) {
            try {
                // Détermination de l'adresse email réelle du client
                $targetClientEmail = null;
                if (!empty($clientEmail) && filter_var($clientEmail, FILTER_VALIDATE_EMAIL) && !str_ends_with($clientEmail, '@client.takapay.bj')) {
                    $targetClientEmail = $clientEmail;
                    // Mise à jour de l'email en base s'il était fictif
                    if (empty($resolvedUser->email) || str_ends_with($resolvedUser->email, '@client.takapay.bj')) {
                        $resolvedUser->update(['email' => $clientEmail]);
                    }
                } elseif (!empty($resolvedUser->email) && !str_ends_with($resolvedUser->email, '@client.takapay.bj')) {
                    $targetClientEmail = $resolvedUser->email;
                }

                // 1. Email au client (si adresse réelle identifiée)
                if ($targetClientEmail) {
                    Mail::to($targetClientEmail)->send(
                        new ClientPaymentConfirmationMail(
                            $resolvedCommande,
                            $resolvedUser,
                            $finalAmount,
                            $transactionId,
                            $network,
                            $resolvedCagnotte
                        )
                    );
                    Log::info('Email de confirmation envoyé au client : ' . $targetClientEmail);
                } else {
                    Log::warning('Aucun email client valide pour la commande : ' . $resolvedCommande->reference);
                }

                // 2. Email à l'administrateur / marchand
                $adminEmail = config('mail.admin_email') ?? env('ADMIN_NOTIFICATION_EMAIL');
                if (!empty($adminEmail)) {
                    Mail::to($adminEmail)->send(
                        new MerchantPaymentNotificationMail(
                            $resolvedCommande,
                            $resolvedUser,
                            $finalAmount,
                            $transactionId,
                            $network,
                            $resolvedCagnotte
                        )
                    );
                    Log::info('Email de notification marchand envoyé à : ' . $adminEmail);
                }
            } catch (\Throwable $e) {
                Log::error("Erreur lors de l'envoi des emails de confirmation : " . $e->getMessage());
            }
        }
    }
}
