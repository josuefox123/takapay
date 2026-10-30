<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCagnotteRequest;
use App\Http\Requests\UpdateCagnotteRequest;
use App\Http\Resources\CagnotteResource;
use App\Models\Cagnotte;
use App\Models\Commande;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CagnotteController extends Controller
{
    /**
     * Liste paginée des cagnottes.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user('sanctum');
        $userId = $request->query('user_id') ?? $user?->id;

        $query = Cagnotte::has('produit')
            ->with(['utilisateur', 'produit.imageProduits', 'produit.parametreProduit', 'produit.sousCategorie.categorie', 'transactions'])
            ->latest();

        // Si l'utilisateur est authentifié avec un rôle administrateur
        if ($user && $user->role !== 'client') {
            if ($userId) {
                $query->where('utilisateur_id', $userId);
            }
        } else {
            // Espace client ou visiteur : filtrer strictement par son user_id
            if (! empty($userId)) {
                $query->where('utilisateur_id', $userId);
            } else {
                // Aucun utilisateur identifié : renvoyer une liste vide (0 cagnotte pour les visiteurs)
                $query->whereRaw('1 = 0');
            }
        }

        return CagnotteResource::collection($query->get());
    }

    /**
     * Créer une cagnotte.
     */
    public function store(StoreCagnotteRequest $request): JsonResponse
    {
        $cagnotte = Cagnotte::create($request->validated());

        return (new CagnotteResource($cagnotte))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une cagnotte.
     */
    public function show(Cagnotte $cagnotte): CagnotteResource
    {
        return new CagnotteResource($cagnotte);
    }

    /**
     * Modifier une cagnotte.
     */
    public function update(
        UpdateCagnotteRequest $request,
        Cagnotte $cagnotte
    ): CagnotteResource {
        $cagnotte->update($request->validated());

        return new CagnotteResource($cagnotte);
    }

    /**
     * Supprimer une cagnotte.
     */
    public function destroy(Cagnotte $cagnotte): JsonResponse
    {
        $cagnotte->delete();

        return response()->json([
            'message' => 'Cagnotte supprimée avec succès.'
        ]);
    }

    /**
     * Confirmer la réception d'un article par le client (Paiement cash / livraison).
     */
    public function confirmerReception(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        $cagnotte->update([
            'statut' => 'terminee',
            'montant_verse' => $cagnotte->prix_unitaire,
        ]);

        $cagnotte->transactions()->update(['statut' => 'succes']);

        // Mise à jour de la commande liée via transaction ou jointure utilisateur + produit
        $tx = $cagnotte->transactions()->whereNotNull('commande_id')->latest()->first();
        $commande = $tx?->commande;

        if (!$commande && $cagnotte->utilisateur_id && $cagnotte->produit_id) {
            $commande = Commande::where('utilisateur_id', $cagnotte->utilisateur_id)
                ->whereHas('commandeProduits', fn ($q) => $q->where('produit_id', $cagnotte->produit_id))
                ->latest()
                ->first();
        }

        if ($commande) {
            $commande->update([
                'statut' => 'terminee',
                'statut_reception' => 'recu',
            ]);
        }

        if ($cagnotte->utilisateur_id) {
            Notification::create([
                'utilisateur_id' => $cagnotte->utilisateur_id,
                'cagnotte_id' => $cagnotte->id,
                'titre' => 'Réception confirmée',
                'message' => 'Vous avez confirmé la bonne réception de votre article ' . ($cagnotte->produit?->nom ?? '') . '. Votre commande est désormais finalisée.',
                'type' => 'infos',
                'statut' => 'non_lu',
            ]);
        }

        return response()->json([
            'message' => 'Réception confirmée avec succès.',
            'cagnotte' => new CagnotteResource($cagnotte->load(['utilisateur', 'produit'])),
        ]);
    }

    /**
     * Demande d'annulation d'une cagnotte par le client.
     * Déduction de 5% de frais de gestion TakaPay et programmation du remboursement des 95% sous 24H.
     */
    public function demanderAnnulation(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        if (in_array($cagnotte->statut, ['annulee', 'terminee', 'annulation_demandee'])) {
            return response()->json([
                'message' => 'Cette cagnotte ne peut pas être annulée ou a déjà fait l\'objet d\'une demande.',
            ], 422);
        }

        $totalVerse = (float) $cagnotte->montant_verse;
        $frais = round($totalVerse * 0.05, 2);
        $remboursement = max(0, round($totalVerse * 0.95, 2));

        $telephone = $request->input('telephone')
            ?? $cagnotte->telephone_livraison
            ?? $cagnotte->utilisateur?->telephone
            ?? $request->user('sanctum')?->telephone
            ?? 'Numéro de paiement';

        $cagnotte->update([
            'statut' => 'annulation_demandee',
            'montant_remboursement' => $remboursement,
            'frais_annulation' => $frais,
            'telephone_remboursement' => $telephone,
            'date_demande_annulation' => now(),
        ]);

        if ($totalVerse > 0) {
            $cagnotte->transactions()->create([
                'reference_externe' => 'REM-' . strtoupper(uniqid()),
                'date' => now(),
                'statut' => 'en_attente',
                'montant' => $remboursement,
                'prestataire' => 'FEEXPAY',
                'type' => 'remboursement',
                'moyen_paiement' => $cagnotte->moyen_paiement ?? 'Mobile Money',
                'devise' => 'XOF',
            ]);
        }

        if ($cagnotte->utilisateur_id) {
            Notification::create([
                'utilisateur_id' => $cagnotte->utilisateur_id,
                'cagnotte_id' => $cagnotte->id,
                'titre' => 'Demande d\'annulation enregistrée',
                'message' => "Votre demande d'annulation pour l'article " . ($cagnotte->produit?->nom ?? '') . " a bien été enregistrée. Des frais de gestion de 5% (" . number_format($frais, 0, ',', ' ') . " FCFA) sont déduits. Le montant de " . number_format($remboursement, 0, ',', ' ') . " FCFA vous sera reversé sous 24H sur votre numéro " . $telephone . ".",
                'type' => 'alerte',
                'statut' => 'non_lu',
            ]);
        }

        return response()->json([
            'message' => 'Demande d\'annulation enregistrée avec succès. Votre remboursement de 95% sera envoyé sous 24H.',
            'remboursement' => [
                'total_verse' => $totalVerse,
                'frais_5_pourcent' => $frais,
                'net_remboursable' => $remboursement,
                'telephone' => $telephone,
                'delai' => '24H',
            ],
            'cagnotte' => new CagnotteResource($cagnotte->load(['utilisateur', 'produit', 'transactions'])),
        ]);
    }

    /**
     * Valide et exécute le remboursement d'une cagnotte annulée via l'API Payout de FeexPay (ou manuellement).
     */
    public function validerRemboursementFeexpay(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        $request->validate([
            'mode' => 'nullable|string|in:feexpay_api,manuel',
            'network' => 'nullable|string|in:MTN,MOOV,CELTIIS',
            'telephone' => 'nullable|string',
        ]);

        if (!in_array($cagnotte->statut, ['annulation_demandee', 'annulee'])) {
            return response()->json([
                'message' => 'Cette cagnotte ne peut pas faire l\'objet d\'un remboursement.',
            ], 422);
        }

        $mode = $request->input('mode', 'feexpay_api');
        $rawPhone = $request->input('telephone')
            ?? $cagnotte->telephone_remboursement
            ?? $cagnotte->telephone_livraison
            ?? $cagnotte->utilisateur?->telephone;

        // Normalisation au plan national 10 chiffres (Bénin : 229 + 01XXXXXXXX)
        $cleanPhone = preg_replace('/[^0-9]/', '', (string) $rawPhone);
        if (str_starts_with($cleanPhone, '00229')) {
            $cleanPhone = substr($cleanPhone, 5);
        } elseif (str_starts_with($cleanPhone, '229')) {
            $cleanPhone = substr($cleanPhone, 3);
        }
        if (strlen($cleanPhone) === 8) {
            $cleanPhone = '01' . $cleanPhone;
        }
        $fullPhone = '229' . $cleanPhone;

        // Détection du réseau si non spécifié (MTN, MOOV, CELTIIS)
        $network = strtoupper((string) $request->input('network', ''));
        if (!in_array($network, ['MTN', 'MOOV', 'CELTIIS'])) {
            $prefix = (strlen($cleanPhone) === 10 && str_starts_with($cleanPhone, '01'))
                ? substr($cleanPhone, 2, 2)
                : substr($cleanPhone, 0, 2);

            if (in_array($prefix, ['51', '52', '53', '54', '56', '57', '59', '61', '62', '66', '67', '69', '90', '91', '96', '97'])) {
                $network = 'MTN';
            } elseif (in_array($prefix, ['55', '60', '63', '64', '65', '68', '94', '95', '98', '99'])) {
                $network = 'MOOV';
            } elseif (in_array($prefix, ['40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '92', '93'])) {
                $network = 'CELTIIS';
            } else {
                $network = 'MTN';
            }
        }

        $montantNet = (int) ($cagnotte->montant_remboursement > 0
            ? $cagnotte->montant_remboursement
            : round(((float) $cagnotte->montant_verse) * 0.95));

        $referencePaiement = 'PAYOUT_CAG_' . $cagnotte->id . '_' . time();

        if ($mode === 'feexpay_api') {
            $shopId = config('services.feexpay.shop_id');
            $apiKey = config('services.feexpay.api_key');
            $isLive = config('services.feexpay.mode') === 'LIVE';

            $baseUrl = $isLive ? 'https://api-v2.feexpay.me' : 'https://sandbox-api.feexpay.me';
            $path = ($network === 'CELTIIS')
                ? '/api/payouts/public/celtiis_bj'
                : '/api/payouts/public/transfer/global';

            $payload = [
                'amount' => $montantNet,
                'phoneNumber' => $fullPhone,
                'shop' => $shopId,
                'network' => $network,
                'motif' => substr('Remboursement ' . ($cagnotte->code ?? ('CG' . $cagnotte->id)), 0, 30),
            ];

            try {
                $response = Http::timeout(25)
                    ->withToken($apiKey)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ])
                    ->post($baseUrl . $path, $payload);
            } catch (\Throwable $e) {
                Log::error('Exception FeexPay Payout :', ['error' => $e->getMessage()]);
                return response()->json([
                    'message' => 'Impossible de contacter le serveur FeexPay : ' . $e->getMessage(),
                ], 500);
            }

            $resData = $response->json();
            Log::info('Réponse FeexPay Payout :', ['status' => $response->status(), 'data' => $resData]);

            if (!$response->successful() || ($resData['success'] ?? true) === false) {
                $code = $resData['code'] ?? '';
                $rawMsg = $resData['message'] ?? $resData['reason'] ?? $resData['description'] ?? 'Le serveur FeexPay a refusé le virement.';

                if ($code === 'IP_NOT_ALLOWED' || str_contains(strtoupper((string) $rawMsg), 'WHITELIST')) {
                    $errMsg = "Sécurité FeexPay : Votre adresse IP n'est pas enregistrée. Ajoutez l'adresse IP dans votre tableau de bord FeexPay > Sécurité / IP Whitelist ({$rawMsg}).";
                } elseif (str_contains(strtoupper((string) $rawMsg), 'BALANCE') || str_contains(strtoupper((string) $rawMsg), 'SOLDE')) {
                    $errMsg = "Solde FeexPay insuffisant : Veuillez approvisionner votre compte FeexPay sur le réseau {$network}.";
                } else {
                    $errMsg = "Échec FeexPay : {$rawMsg}";
                }

                return response()->json([
                    'message' => $errMsg,
                    'details' => $resData,
                ], 422);
            }

            $referencePaiement = $resData['reference'] ?? $resData['transaction_id'] ?? $resData['id'] ?? $referencePaiement;
        } else {
            $referencePaiement = 'PAYOUT_MANUEL_' . time();
        }

        // 1. Passage du statut de la cagnotte à annulee
        $cagnotte->update([
            'statut' => 'annulee',
        ]);

        // 2. Mise à jour de la transaction comptable de remboursement
        $transaction = $cagnotte->transactions()->where('type', 'remboursement')->latest()->first();
        if ($transaction) {
            $transaction->update([
                'reference_externe' => $referencePaiement,
                'statut' => 'succes',
                'moyen_paiement' => $network,
            ]);
        } else {
            $cagnotte->transactions()->create([
                'reference_externe' => $referencePaiement,
                'date' => now(),
                'statut' => 'succes',
                'montant' => $montantNet,
                'prestataire' => 'FEEXPAY',
                'type' => 'remboursement',
                'moyen_paiement' => $network,
                'devise' => 'XOF',
            ]);
        }

        // 3. Notification d'information pour le client
        if ($cagnotte->utilisateur_id) {
            Notification::create([
                'utilisateur_id' => $cagnotte->utilisateur_id,
                'cagnotte_id' => $cagnotte->id,
                'titre' => 'Remboursement Mobile Money effectué',
                'message' => 'Votre remboursement de ' . number_format($montantNet, 0, ',', ' ') . ' FCFA a été viré avec succès sur votre numéro Mobile Money (' . $fullPhone . ') via ' . $network . '. Réf: ' . $referencePaiement . '.',
                'type' => 'alerte',
                'statut' => 'non_lu',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Remboursement de ' . number_format($montantNet, 0, ',', ' ') . ' FCFA validé avec succès.',
            'reference' => $referencePaiement,
            'cagnotte' => new CagnotteResource($cagnotte->load(['utilisateur', 'produit', 'transactions'])),
        ]);
    }
}
