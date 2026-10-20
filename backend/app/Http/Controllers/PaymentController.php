<?php

namespace App\Http\Controllers;

use App\Mail\ClientPaymentConfirmationMail;
use App\Mail\MerchantPaymentNotificationMail;
use App\Models\Cagnotte;
use App\Models\Commande;
use App\Models\CommandeProduit;
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
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'produit_id' => 'nullable|integer',
            'cagnotte_id' => 'nullable|integer',
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

        $reference = 'CMD_' . time() . '_' . rand(1000, 9999);
        $amount = (float) $request->amount;
        $commande = null;

        // Si l'utilisateur est présent ou résolu, on persiste la commande
        if ($user) {
            $commande = DB::transaction(function () use ($user, $reference, $amount, $request) {
                $cmd = Commande::create([
                    'utilisateur_id' => $user->id,
                    'reference' => $reference,
                    'statut' => 'en_attente',
                    'prix_total' => $amount,
                ]);

                if ($request->filled('produit_id')) {
                    $quantite = (int) $request->input('quantite', 1);
                    CommandeProduit::create([
                        'commande_id' => $cmd->id,
                        'produit_id' => $request->produit_id,
                        'quantite' => $quantite,
                        'prix_unitaire' => $amount,
                        'total' => $amount * $quantite,
                    ]);
                }

                return $cmd;
            });
        }

        return response()->json([
            'shop_id' => config('services.feexpay.shop_id'),
            'api_key' => config('services.feexpay.api_key'),
            'mode' => config('services.feexpay.mode', 'SANDBOX'),
            'amount' => $amount,
            'reference' => $reference,
            'commande_id' => $commande?->id,
            'cagnotte_id' => $request->cagnotte_id,
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
                if ($cmdProduit && $cmdProduit->produit_id) {
                    $cagnotte = Cagnotte::firstOrCreate(
                        [
                            'produit_id' => $cmdProduit->produit_id,
                            'prix_unitaire' => $cmdProduit->prix_unitaire,
                        ],
                        [
                            'montant_verse' => 0,
                            'moyen_paiement' => $network,
                            'statut' => 'en_cours',
                        ]
                    );
                    $cagnotte->increment('montant_verse', $finalAmount);
                    if ($cagnotte->montant_verse >= $cagnotte->prix_unitaire) {
                        $cagnotte->update(['statut' => 'terminee']);
                    }
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
                        'type' => 'commande',
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
