<?php

namespace App\Http\Controllers;

use App\Mail\ClientPaymentConfirmationMail;
use App\Mail\MerchantPaymentNotificationMail;
use App\Models\Cagnotte;
use App\Models\Commande;
use App\Models\CommandeProduit;
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
                // Paiement comptant : le montant est STRICTEMENT imposé par le catalogue (sécurité anti-manipulation)
                $amount = $prixCash > 0 ? $prixCash : $fullProductPrice;
                $reference = 'CMD_CASH_' . time() . '_' . rand(1000, 9999);
            } else {
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

            if ($user) {
                $commande = DB::transaction(function () use ($user, $reference, $amount, $fullProductPrice, $produitId, $quantite) {
                    $cmd = Commande::create([
                        'utilisateur_id' => $user->id,
                        'reference' => $reference,
                        'statut' => 'en_attente',
                        'prix_total' => $amount,
                    ]);

                    CommandeProduit::create([
                        'commande_id' => $cmd->id,
                        'produit_id' => $produitId,
                        'quantite' => $quantite,
                        'prix_unitaire' => $fullProductPrice, // Vrai prix catalogue du produit
                        'total' => $fullProductPrice * $quantite,
                    ]);

                    return $cmd;
                });
            }
        }

        return response()->json([
            'shop_id' => config('services.feexpay.shop_id'),
            'api_key' => config('services.feexpay.api_key'),
            'mode' => config('services.feexpay.mode', 'SANDBOX'),
            'amount' => $amount,
            'reference' => $reference,
            'commande_id' => $commande?->id,
            'cagnotte_id' => $cagnotteId,
            'type_paiement' => $typePaiement,
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
                    if ($cagnotte->montant_verse >= $cagnotte->prix_unitaire) {
                        $cagnotte->update(['statut' => 'terminee']);
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

                // Si ce n'est PAS un achat comptant, on crée la cagnotte avec le vrai prix total du produit
                if (!$isCash && $cmdProduit && $cmdProduit->produit_id) {
                    $cagnotte = Cagnotte::create([
                        'produit_id' => $cmdProduit->produit_id,
                        'prix_unitaire' => $cmdProduit->prix_unitaire, // Prix total réel du produit
                        'montant_verse' => $finalAmount,
                        'moyen_paiement' => $network,
                        'statut' => $finalAmount >= $cmdProduit->prix_unitaire ? 'terminee' : 'en_cours',
                    ]);
                    $cagnotteId = $cagnotte->id;
                    $resolvedCagnotte = $cagnotte;
                }

                Transaction::firstOrCreate(
                    ['reference_externe' => $transactionId],
                    [
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
