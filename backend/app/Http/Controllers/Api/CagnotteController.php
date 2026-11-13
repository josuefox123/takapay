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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CagnotteController extends Controller
{
    /**
     * Liste paginée des cagnottes.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = Cagnotte::has('produit')
            ->with([
                'utilisateur',
                'produit.imageProduits',
                'produit.parametreProduit',
                'produit.sousCategorie.categorie',
                'transactions' => fn ($q) => $q->where(function ($sub) {
                    $sub->whereIn('statut', ['succes', 'reussi'])
                        ->orWhere('type', 'remboursement')
                        ->orWhere('prestataire', 'LIVRAISON')
                        ->orWhere('moyen_paiement', 'livraison');
                })->orderByDesc('date')->orderByDesc('id'),
            ])
            ->where(function ($q) {
                $q->whereNotIn('statut', ['en_attente', 'initialisation'])
                    ->orWhere('montant_verse', '>', 0)
                    ->orWhere('moyen_paiement', 'livraison')
                    ->orWhere('statut', 'en_attente_livraison')
                    ->orWhereHas('transactions', function ($t) {
                        $t->where('moyen_paiement', 'livraison');
                    });
            })
            ->latest();

        // 2. Administrateurs / super_admin : accès aux cagnottes de leurs produits
        if ($user->isAdmin()) {
            if ($user->role === 'admin') {
                $query->whereHas('produit', fn ($q) => $q->where('admin_id', $user->id));
            }
        } else {
            // 3. Client authentifié : uniquement ses propres cagnottes
            $query->where('utilisateur_id', $user->id);
        }

        return CagnotteResource::collection($query->get());
    }

    /**
     * Liste des cagnottes pour le back-office administration.
     * Route : GET /api/admin/cagnottes
     *
     * Pour super_admin : visibilité complète sur l'ensemble des cagnottes de chaque admin.
     * Pour admin : uniquement les cagnottes associées aux produits qu'il gère.
     */
    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = Cagnotte::has('produit')
            ->with([
                'utilisateur',
                'produit.imageProduits',
                'produit.parametreProduit',
                'produit.sousCategorie.categorie',
                'transactions' => fn ($q) => $q->where(function ($sub) {
                    $sub->whereIn('statut', ['succes', 'reussi'])
                        ->orWhere('type', 'remboursement')
                        ->orWhere('prestataire', 'LIVRAISON')
                        ->orWhere('moyen_paiement', 'livraison');
                })->orderByDesc('date')->orderByDesc('id'),
            ])
            ->where(function ($q) {
                $q->whereNotIn('statut', ['en_attente', 'initialisation'])
                    ->orWhere('montant_verse', '>', 0)
                    ->orWhere('moyen_paiement', 'livraison')
                    ->orWhere('statut', 'en_attente_livraison')
                    ->orWhereHas('transactions', function ($t) {
                        $t->where('moyen_paiement', 'livraison');
                    });
            })
            ->latest();

        // Si rôle admin (délégué), restreindre aux produits de cet admin
        if ($user && $user->role === 'admin') {
            $query->whereHas('produit', fn ($q) => $q->where('admin_id', $user->id));
        }
        // Pour super_admin : aucune restriction, visibilité totale sur tous les produits et admins

        return CagnotteResource::collection($query->get());
    }

    /**
     * Créer une cagnotte.
     */
    public function store(StoreCagnotteRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (!empty($data['produit_id'])) {
            $produit = \App\Models\Produit::find($data['produit_id']);
            if ($produit && $produit->stock <= 0) {
                return response()->json([
                    'message' => 'Désolé, cet article est actuellement en rupture de stock.',
                ], 422);
            }
        }

        $cagnotte = Cagnotte::create($data);

        if ($cagnotte->produit) {
            $cagnotte->produit->decrement('stock', 1);
        }

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
     * Supprimer une cagnotte non payée appartenant au client connecté.
     */
    public function destroyUnpaid(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        $user = $request->user('sanctum');
        abort_unless($user && ($user->isAdmin() || $cagnotte->utilisateur_id === $user->id), 404);

        $hasSuccessfulPayment = $cagnotte->transactions()
            ->whereIn('statut', ['succes', 'reussi'])
            ->exists();
        $isCashOnDelivery = strtolower((string) $cagnotte->moyen_paiement) === 'livraison'
            || $cagnotte->transactions()->where('type', 'paiement_livraison')->exists();

        if (
            (float) $cagnotte->montant_verse > 0
            || $hasSuccessfulPayment
            || $isCashOnDelivery
            || in_array($cagnotte->statut, ['terminee', 'annulee', 'annulation_demandee'], true)
        ) {
            return response()->json([
                'message' => 'Seule une cagnotte sans paiement confirmé peut être supprimée.',
            ], 422);
        }

        DB::transaction(function () use ($cagnotte) {
            $commandeIds = $cagnotte->transactions()
                ->whereNotNull('commande_id')
                ->pluck('commande_id');

            if ($commandeIds->isNotEmpty()) {
                Commande::whereIn('id', $commandeIds)
                    ->where('statut', 'en_attente')
                    ->update(['statut' => 'annulee']);
            }

            $cagnotte->delete();
        });

        return response()->json([
            'message' => 'Cagnotte non payée supprimée.',
        ]);
    }

    /**
     * Vérifie que l'utilisateur connecté est le propriétaire de la cagnotte ou l'administrateur autorisé.
     */
    private function authorizeCagnotteOwnerOrProductAdmin(Request $request, Cagnotte $cagnotte): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Non authentifié.');
        }

        if ($user->role === 'super_admin') {
            return;
        }

        if ($user->role === 'admin') {
            $produitAdminId = $cagnotte->produit?->admin_id;
            if (! $produitAdminId || (int) $produitAdminId !== (int) $user->id) {
                abort(403, 'Accès non autorisé à cette cagnotte.');
            }
            return;
        }

        if ((int) $cagnotte->utilisateur_id !== (int) $user->id) {
            abort(403, 'Vous n\'êtes pas autorisé à modifier cette cagnotte.');
        }
    }

    /**
     * Confirmer la réception d'un article par le client (Paiement cash / livraison ou cagnotte soldée).
     */
    public function confirmerReception(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        $this->authorizeCagnotteOwnerOrProductAdmin($request, $cagnotte);

        $isCod = $cagnotte->moyen_paiement === 'livraison'
            || $cagnotte->transactions()->where('prestataire', 'LIVRAISON')->exists();
        $objectif = (float) ($cagnotte->objectif_effectif ?: $cagnotte->prix_unitaire);
        $isFullyPaid = $objectif > 0 && (float) $cagnotte->montant_verse >= $objectif;

        if (! $isCod && ! $isFullyPaid && $cagnotte->statut !== 'terminee') {
            return response()->json([
                'message' => 'La réception ne peut être confirmée que lorsque la cagnotte est soldée à 100 % ou pour une commande payable à la livraison.',
            ], 422);
        }

        $cagnotte->update([
            'statut' => 'terminee',
            'montant_verse' => $isCod ? $cagnotte->prix_unitaire : $cagnotte->montant_verse,
        ]);

        if ($isCod) {
            $cagnotte->transactions()->where('prestataire', 'LIVRAISON')->update(['statut' => 'succes']);
        }

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
     * Frais de gestion à 0% et programmation du remboursement intégral (100%) sous 24H.
     */
    public function demanderAnnulation(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        $this->authorizeCagnotteOwnerOrProductAdmin($request, $cagnotte);

        if (in_array($cagnotte->statut, ['annulee', 'terminee', 'annulation_demandee'])) {
            return response()->json([
                'message' => 'Cette cagnotte ne peut pas être annulée ou a déjà fait l\'objet d\'une demande.',
            ], 422);
        }

        $totalVerse = (float) $cagnotte->montant_verse;
        $frais = 0.0;
        $remboursement = $totalVerse;

        $rawInputPhone = $request->filled('telephone')
            ? preg_replace('/[\s\-\.]+/', '', trim((string) $request->input('telephone')))
            : null;
        if ($rawInputPhone && ! preg_match('/^\+?[0-9]{8,15}$/', $rawInputPhone)) {
            return response()->json([
                'message' => 'Le numéro de téléphone de remboursement est invalide.',
            ], 422);
        }

        $telephone = $rawInputPhone
            ?? $cagnotte->telephone_livraison
            ?? $cagnotte->utilisateur?->telephone
            ?? $request->user()?->telephone
            ?? 'Numéro de paiement';

        $motif = $request->input('motif_annulation') ?? $request->input('motif') ?? $request->input('raison');
        $motifClean = $motif ? trim(strip_tags((string) $motif)) : null;

        $updatePayload = [
            'statut' => 'annulation_demandee',
            'montant_remboursement' => $remboursement,
            'frais_annulation' => $frais,
            'telephone_remboursement' => $telephone,
            'date_demande_annulation' => now(),
        ];

        if ($motifClean !== null && $motifClean !== '') {
            if (\Illuminate\Support\Facades\Schema::hasColumn('cagnottes', 'motif_annulation')) {
                $updatePayload['motif_annulation'] = $motifClean;
            }
            $existingNote = $cagnotte->note_livraison ? trim($cagnotte->note_livraison) : '';
            $updatePayload['note_livraison'] = $existingNote !== ''
                ? $existingNote . "\n[Annulation] Motif : " . $motifClean
                : '[Annulation] Motif : ' . $motifClean;
        }

        $cagnotte->update($updatePayload);

        // Incrémentation du stock disponible car la commande / cagnotte est annulée
        if ($cagnotte->produit) {
            $cagnotte->produit->increment('stock', 1);
        }

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

        $clientEmail = $request->input('email')
            ?? $cagnotte->utilisateur?->email
            ?? $request->user('sanctum')?->email;

        $cagnotte->sendCagnotteAnnuleeNotification($remboursement, $frais, $telephone, $clientEmail);

        return response()->json([
            'message' => 'Demande d\'annulation enregistrée avec succès. Votre remboursement intégral (100%) sera envoyé sous 24H.',
            'remboursement' => [
                'total_verse' => $totalVerse,
                'frais' => $frais,
                'frais_5_pourcent' => $frais,
                'net_remboursable' => $remboursement,
                'telephone' => $telephone,
                'delai' => '24H',
            ],
            'cagnotte' => new CagnotteResource($cagnotte->load(['utilisateur', 'produit', 'transactions'])),
        ]);
    }

    /**
     * Rétablir une cagnotte annulée ou en cours d'annulation.
     */
    public function reactiver(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        $this->authorizeCagnotteOwnerOrProductAdmin($request, $cagnotte);

        if (!in_array($cagnotte->statut, ['annulation_demandee', 'annulee'])) {
            return response()->json([
                'message' => 'Seule une cagnotte annulée ou en attente de remboursement peut être rétablie.',
            ], 422);
        }

        if ($cagnotte->transactions()->where('type', 'remboursement')->whereIn('statut', ['succes', 'reussi'])->exists()) {
            return response()->json([
                'message' => 'Cette cagnotte a déjà été remboursée et ne peut plus être rétablie.',
            ], 422);
        }

        // Vérification de stock disponible avant réactivation
        $produit = $cagnotte->produit;
        if ($produit && $produit->stock <= 0) {
            return response()->json([
                'message' => 'Impossible de rétablir cette cagnotte : cet article est actuellement en rupture de stock.',
            ], 422);
        }

        $inputStatut = $request->input('statut');
        $isCash = $cagnotte->moyen_paiement === 'livraison' || str_starts_with((string) ($cagnotte->transactions()->latest()->first()?->reference_externe ?? ''), 'CMD_COD_');
        $newStatut = ($inputStatut === 'en_attente' || $isCash) ? 'en_attente' : 'en_cours';

        $cagnotte->update([
            'statut' => $newStatut,
            'montant_remboursement' => null,
            'frais_annulation' => null,
            'telephone_remboursement' => null,
            'date_demande_annulation' => null,
        ]);

        // Nettoyage de la transaction de remboursement en attente
        $cagnotte->transactions()->where('type', 'remboursement')->where('statut', 'en_attente')->delete();

        // Décrémenter à nouveau le stock puisque la cagnotte redevient active
        if ($produit) {
            $produit->decrement('stock', 1);
        }

        $clientEmail = $request->input('email')
            ?? $cagnotte->utilisateur?->email
            ?? $request->user('sanctum')?->email;

        $cagnotte->sendCagnotteRetablieNotification($clientEmail);

        return response()->json([
            'success' => true,
            'message' => 'Votre cagnotte a été rétablie avec succès.',
            'cagnotte' => new CagnotteResource($cagnotte->fresh()->load(['utilisateur', 'produit', 'transactions'])),
        ]);
    }

    /**
     * Valide et exécute le remboursement d'une cagnotte annulée via l'API Payout de FeexPay (ou manuellement).
     */
    public function validerRemboursementFeexpay(Request $request, Cagnotte $cagnotte): JsonResponse
    {
        $admin = $request->user();
        if (! $admin || ! in_array($admin->role, ['admin', 'super_admin'], true)) {
            abort(403, 'Action réservée aux administrateurs.');
        }

        if ($admin->role === 'admin' && (! $cagnotte->produit?->admin_id || (int) $cagnotte->produit->admin_id !== (int) $admin->id)) {
            abort(403, 'Accès non autorisé à cette cagnotte.');
        }

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

        // Protection idempotence : empêcher tout double remboursement
        if ($cagnotte->transactions()->where('type', 'remboursement')->whereIn('statut', ['succes', 'reussi'])->exists()) {
            return response()->json([
                'message' => 'Le remboursement de cette cagnotte a déjà été exécuté.',
            ], 422);
        }

        $mode = $request->input('mode', 'feexpay_api');
        $rawPhone = $cagnotte->telephone_remboursement
            ?? $cagnotte->telephone_livraison
            ?? $cagnotte->utilisateur?->telephone
            ?? $request->input('telephone');

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
