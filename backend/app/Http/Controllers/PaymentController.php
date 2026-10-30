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
use Illuminate\Support\Facades\Http;
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

        $isCod = $request->input('moyen_paiement') === 'livraison';
        if (! $isCod && (! config('services.feexpay.shop_id') || ! config('services.feexpay.api_key'))) {
            return response()->json([
                'message' => 'Le paiement FeexPay n’est pas configuré. Veuillez réessayer plus tard.',
            ], 503);
        }

        $user = $request->user('sanctum');
        if (!$user && $request->filled('user_id')) {
            $user = User::find($request->input('user_id'));
        }
        if (!$user && ($request->filled('telephone_livraison') || $request->filled('delivery_phone') || $request->filled('telephone'))) {
            $phone = preg_replace('/\D/', '', $request->input('telephone_livraison') ?? $request->input('delivery_phone') ?? $request->input('telephone'));
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
                // Cagnotte : vérifier le 1er versement plancher en tenant compte des réductions promotionnelles
                $rawMin = (float) ($param?->prix_minimum ?? 0);
                $prixMinimum = $rawMin > 0
                    ? ($promoPct > 0 ? round($rawMin * (1 - $promoPct / 100)) : $rawMin)
                    : round($fullProductPrice * 0.1);

                // Autoriser également si le montant correspond au moins à l'Offre 10% du prix remisé
                $deposit10 = round($fullProductPrice * 0.10);
                if ($deposit10 > 0 && $requestedAmount >= $deposit10) {
                    $prixMinimum = min($prixMinimum, $requestedAmount);
                }

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
            'transaction_id' => 'required|string',
        ]);

        $reference = $request->input('reference');
        $transactionId = $request->input('transaction_id');
        $network = $request->input('reseau') ?? $request->input('network') ?? 'MOBILE_MONEY';
        $clientEmail = $request->input('client_email') ?? $request->input('email');

        $providerTransaction = $this->fetchFeexPayTransaction($transactionId);
        if ($providerTransaction === null) {
            return response()->json([
                'status' => 'unverified',
                'message' => 'Impossible de vérifier le paiement auprès de FeexPay pour le moment.',
            ], 503);
        }

        $providerStatus = strtoupper((string) ($providerTransaction['status'] ?? $providerTransaction['statut'] ?? ''));
        if (! in_array($providerStatus, ['SUCCESSFUL', 'SUCCESS', 'PAID'], true)) {
            return response()->json([
                'status' => 'pending',
                'message' => 'FeexPay n’a pas encore confirmé ce paiement.',
            ], 422);
        }

        $providerReference = $providerTransaction['custom_id']
            ?? $providerTransaction['customId']
            ?? $providerTransaction['custom_reference']
            ?? null;
        if ($providerReference === null || (string) $providerReference !== $reference) {
            return response()->json([
                'status' => 'unverified',
                'message' => 'La référence du paiement ne correspond pas à cette commande.',
            ], 422);
        }

        $isDeposit = preg_match('/^DEP_CAG_(\d+)_/', $reference, $matches) === 1;
        $userId = null;
        $amount = (float) ($providerTransaction['amount'] ?? $providerTransaction['montant'] ?? 0);

        if ($isDeposit) {
            $cagnotte = Cagnotte::find((int) $matches[1]);
            if (! $cagnotte || $cagnotte->statut === 'annulee') {
                return response()->json([
                    'status' => 'unverified',
                    'message' => 'Cette cagnotte n’accepte pas ce paiement.',
                ], 422);
            }

            $remaining = max(0, (float) $cagnotte->prix_unitaire - (float) $cagnotte->montant_verse);
            if ($amount <= 0 || $amount > $remaining) {
                return response()->json([
                    'status' => 'unverified',
                    'message' => 'Le montant confirmé par FeexPay ne correspond pas au solde de la cagnotte.',
                ], 422);
            }
            $userId = $cagnotte->utilisateur_id;
        } else {
            $commande = Commande::where('reference', $reference)->first();
            if (! $commande || (!str_starts_with($reference, 'CMD_CAG_') && !str_starts_with($reference, 'CMD_CASH_'))) {
                return response()->json([
                    'status' => 'unverified',
                    'message' => 'Aucune commande en attente ne correspond à ce paiement.',
                ], 422);
            }

            $expectedAmount = (float) $commande->prix_total;
            if ($amount > 0 && abs($amount - $expectedAmount) > 0.01) {
                return response()->json([
                    'status' => 'unverified',
                    'message' => 'Le montant confirmé par FeexPay ne correspond pas à la commande.',
                ], 422);
            }
            $amount = $expectedAmount;
            $userId = $commande->utilisateur_id;
        }

        $this->applySuccessfulPayment($reference, $amount, $transactionId, $network, $userId, $clientEmail);

        return response()->json([
            'status' => 'success',
            'message' => 'Paiement confirmé par FeexPay.',
            'amount' => $amount,
            'transaction_id' => $transactionId,
        ]);
    }

    /**
     * Réception du Webhook officiel envoyé par les serveurs FeexPay.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $data = $request->all();
        Log::info('Webhook FeexPay reçu :', $data);

        $reference = $data['reference'] ?? $data['custom_id'] ?? $data['customId'] ?? null;
        $transactionId = $data['transaction_id'] ?? $data['id'] ?? null;
        $network = $data['reseau'] ?? $data['network'] ?? 'MOBILE_MONEY';
        $clientEmail = $data['email'] ?? null;

        if (! $reference || ! $transactionId) {
            Log::warning('Webhook FeexPay sans référence valide', $data);

            return response()->json(['status' => 'error', 'message' => 'Référence ou transaction manquante.'], 400);
        }

        $providerTransaction = $this->fetchFeexPayTransaction((string) $transactionId);
        if ($providerTransaction === null) {
            return response()->json(['status' => 'unverified'], 503);
        }

        $status = strtoupper((string) ($providerTransaction['status'] ?? $providerTransaction['statut'] ?? ''));
        $providerReference = $providerTransaction['custom_id']
            ?? $providerTransaction['customId']
            ?? $providerTransaction['custom_reference']
            ?? null;
        if ($providerReference === null || (string) $providerReference !== (string) $reference) {
            Log::warning('Référence du webhook différente de celle vérifiée auprès de FeexPay.', [
                'reference' => $reference,
                'provider_reference' => $providerReference,
            ]);

            return response()->json(['status' => 'unverified'], 422);
        }

        if (in_array($status, ['SUCCESSFUL', 'SUCCESS', 'PAID'], true)) {
            $amount = (float) ($providerTransaction['amount'] ?? $providerTransaction['montant'] ?? 0);
            if ($amount <= 0) {
                return response()->json(['status' => 'unverified'], 422);
            }
            if (preg_match('/^DEP_CAG_(\d+)_/', (string) $reference, $matches) === 1) {
                $cagnotte = Cagnotte::find((int) $matches[1]);
                $remaining = $cagnotte
                    ? max(0, (float) $cagnotte->prix_unitaire - (float) $cagnotte->montant_verse)
                    : 0;
                if (!$cagnotte || $cagnotte->statut === 'annulee' || $amount > $remaining) {
                    return response()->json(['status' => 'unverified'], 422);
                }
            } else {
                $commande = Commande::where('reference', $reference)->first();
                if (
                    !$commande
                    || (!str_starts_with((string) $reference, 'CMD_CAG_') && !str_starts_with((string) $reference, 'CMD_CASH_'))
                    || abs($amount - (float) $commande->prix_total) > 0.01
                ) {
                    return response()->json(['status' => 'unverified'], 422);
                }
            }
            $this->applySuccessfulPayment($reference, $amount, $transactionId, $network, null, $clientEmail);
        } elseif (in_array($status, ['FAILED', 'CANCELLED'], true)) {
            $commande = Commande::where('reference', $reference)->first();
            if ($commande && $commande->statut === 'en_attente') {
                $commande->update(['statut' => 'echouee']);
            }
        }

        return response()->json(['status' => 'success'], 200);
    }

    /**
     * Retrieve transaction status from FeexPay; browser- and webhook-supplied statuses are untrusted.
     */
    private function fetchFeexPayTransaction(string $transactionId): ?array
    {
        $apiKey = config('services.feexpay.api_key');
        if (! $apiKey || ! config('services.feexpay.shop_id')) {
            return null;
        }

        $baseUrl = config('services.feexpay.mode') === 'LIVE'
            ? 'https://api-v2.feexpay.me'
            : 'https://sandbox-api.feexpay.me';

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout(10)
                ->get($baseUrl.'/api/transactions/public/single/status/'.rawurlencode($transactionId));
        } catch (\Throwable $e) {
            Log::warning('Vérification FeexPay indisponible : '.$e->getMessage());

            return null;
        }

        if (! $response->successful()) {
            Log::warning('FeexPay a refusé la vérification de transaction.', [
                'http_status' => $response->status(),
            ]);

            return null;
        }

        $payload = $response->json();
        if (! is_array($payload)) {
            return null;
        }

        $transaction = $payload['data'] ?? $payload['transaction'] ?? $payload;

        return is_array($transaction) ? $transaction : null;
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
        $alreadyProcessed = false;

        DB::transaction(function () use ($reference, $amount, $transactionId, $network, $userId, &$resolvedCommande, &$resolvedCagnotte, &$resolvedUser, &$finalAmount, &$alreadyProcessed) {
            $existingTransaction = Transaction::with(['commande.utilisateur', 'cagnotte.produit', 'cagnotte.utilisateur'])
                ->where('reference_externe', $transactionId)
                ->whereIn('statut', ['succes', 'reussi'])
                ->first();

            if ($existingTransaction) {
                $alreadyProcessed = true;
                $resolvedCommande = $existingTransaction->commande;
                $resolvedCagnotte = $existingTransaction->cagnotte;
                $resolvedUser = $resolvedCommande?->utilisateur ?? $resolvedCagnotte?->utilisateur;
                $finalAmount = (float) $existingTransaction->montant;

                return;
            }

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

        if ($alreadyProcessed) {
            return;
        }

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
