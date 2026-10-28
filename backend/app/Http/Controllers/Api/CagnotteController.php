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

        if ($userId && (!$user || $user->role === 'client')) {
            $query->where('utilisateur_id', $userId);
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
}
