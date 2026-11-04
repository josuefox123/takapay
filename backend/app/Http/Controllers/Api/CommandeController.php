<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommandeRequest;
use App\Http\Requests\UpdateCommandeRequest;
use App\Http\Resources\CommandeResource;
use App\Models\Commande;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class CommandeController extends Controller
{
    /**
     * Liste paginée des commandes : les siennes, ou toutes pour un administrateur.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user('sanctum') ?? $request->user();
        $userId = $request->query('user_id') ?? $user?->id;

        $query = Commande::with(['utilisateur', 'commandeProduits.produit', 'transactions.cagnotte'])->latest();

        if ($user && $user->isAdmin()) {
            if ($user->role === 'admin') {
                $query->where(function ($q) use ($user) {
                    $q->whereHas('commandeProduits.produit', fn ($p) => $p->where('admin_id', $user->id))
                        ->orWhereHas('transactions.cagnotte.produit', fn ($p) => $p->where('admin_id', $user->id));
                });
            }
            if ($request->filled('user_id')) {
                $query->where('utilisateur_id', $request->query('user_id'));
            }
        } elseif ($userId) {
            $query->where('utilisateur_id', $userId);
        } else {
            $query->whereRaw('1 = 0');
        }

        // Seules les commandes payées ou confirmées apparaissent
        $query->where(function ($q) {
            $q->whereIn('statut', ['payee', 'terminee', 'livree', 'annulee'])
                ->orWhere('mode_paiement', 'livraison');
        });

        $perPage = (int) $request->query('per_page', 50);
        return CommandeResource::collection($query->paginate($perPage));
    }

    /**
     * Liste paginée des commandes pour le back-office admin.
     * Route : GET /api/admin/commandes
     */
    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Commande::with([
            'utilisateur',
            'commandeProduits.produit',
            'transactions.cagnotte',
        ])
        // Seules les commandes payées ou confirmées apparaissent
        ->where(function ($q) {
            $q->whereIn('statut', ['payee', 'terminee', 'livree', 'annulee'])
                ->orWhere('mode_paiement', 'livraison');
        })
        ->latest();

        if ($user && $user->role === 'admin') {
            $query->where(function ($q) use ($user) {
                $q->whereHas('commandeProduits.produit', fn ($p) => $p->where('admin_id', $user->id))
                    ->orWhereHas('transactions.cagnotte.produit', fn ($p) => $p->where('admin_id', $user->id));
            });
        }

        if ($request->filled('statut')) {
            $query->where('statut', $request->query('statut'));
        }

        if ($request->filled('q')) {
            $q = $request->query('q');
            $query->where(function ($sub) use ($q) {
                $sub->where('reference', 'like', "%{$q}%")
                    ->orWhereHas('utilisateur', fn ($u) => $u
                        ->where('nom', 'like', "%{$q}%")
                        ->orWhere('prenom', 'like', "%{$q}%")
                        ->orWhere('telephone', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%")
                    )
                    ->orWhere('telephone_livraison', 'like', "%{$q}%");
            });
        }

        return CommandeResource::collection($query->paginate(15));
    }

    public function store(StoreCommandeRequest $request): JsonResponse
    {
        $data = $request->validated();

        $data['utilisateur_id'] ??= $request->user()->id;
        $data['prix_total'] ??= 0;

        $commande = Commande::create($data);

        return (new CommandeResource($commande))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Commande $commande): CommandeResource
    {
        $this->authorizeOwnerOrAdmin($request, $commande);

        return new CommandeResource(
            $commande->load(['utilisateur:id,nom', 'commandeProduits.produit:id,nom', 'transactions.cagnotte'])
        );
    }

    public function update(
        UpdateCommandeRequest $request,
        Commande $commande
    ): CommandeResource {
        $commande->update($request->validated());

        return new CommandeResource(
            $commande->fresh(['utilisateur:id,nom', 'commandeProduits.produit:id,nom', 'transactions.cagnotte'])
        );
    }

    public function destroy(Request $request, Commande $commande): JsonResponse
    {
        $this->authorizeOwnerOrAdmin($request, $commande);

        DB::transaction(function () use ($commande) {
            $commande->commandeProduits()->delete();
            $commande->delete();
        });

        return response()->json([
            'message' => 'Commande supprimée avec succès.',
        ]);
    }
}
