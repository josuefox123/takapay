<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommandeProduitRequest;
use App\Http\Requests\UpdateCommandeProduitRequest;
use App\Http\Resources\CommandeProduitResource;
use App\Models\Commande;
use App\Models\CommandeProduit;
use App\Models\ParametreProduit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class CommandeProduitController extends Controller
{
    /**
     * Liste paginée des lignes de commande (administrateur),
     * ou uniquement ses propres lignes pour un client.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = $user->isAdmin()
            ? CommandeProduit::query()
            : CommandeProduit::whereHas('commande', fn ($q) => $q->where('utilisateur_id', $user->id));

        return CommandeProduitResource::collection($query->latest()->paginate(15));
    }

    /**
     * Ajouter un produit à une commande.
     * Le prix vient de la base (paramètre produit) et le total est recalculé.
     */
    public function store(StoreCommandeProduitRequest $request): JsonResponse
    {
        $ligne = DB::transaction(function () use ($request) {
            $data = $request->validated();
            unset($data['total']);

            $parametre = ParametreProduit::where('produit_id', $data['produit_id'])->first();
            $prixUnitaire = $parametre !== null ? (float) $parametre->prix_total : (float) $data['prix_unitaire'];
            $data['prix_unitaire'] = $prixUnitaire;
            $data['total'] = round($prixUnitaire * (int) $data['quantite'], 2);

            $commandeProduit = CommandeProduit::create($data);

            $this->recalculateCommandeTotal($commandeProduit->commande);

            return $commandeProduit;
        });

        return (new CommandeProduitResource($ligne))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une ligne de commande.
     */
    public function show(Request $request, CommandeProduit $commandeProduit): CommandeProduitResource
    {
        $this->authorizeOwnerOrAdmin($request, $commandeProduit->commande, 'utilisateur_id');

        return new CommandeProduitResource($commandeProduit);
    }

    /**
     * Modifier une ligne de commande.
     */
    public function update(
        UpdateCommandeProduitRequest $request,
        CommandeProduit $commandeProduit
    ): CommandeProduitResource {
        $this->authorizeOwnerOrAdmin($request, $commandeProduit->commande, 'utilisateur_id');

        DB::transaction(function () use ($request, $commandeProduit) {
            $data = $request->validated();
            unset($data['total']);

            if (isset($data['produit_id'])) {
                $parametre = ParametreProduit::where('produit_id', $data['produit_id'])->first();
                if ($parametre !== null) {
                    $data['prix_unitaire'] = (float) $parametre->prix_total;
                }
            }

            $commandeProduit->fill($data);
            $commandeProduit->total = round(
                (float) $commandeProduit->prix_unitaire * (int) $commandeProduit->quantite,
                2
            );
            $commandeProduit->save();

            $this->recalculateCommandeTotal($commandeProduit->commande()->first());
        });

        return new CommandeProduitResource($commandeProduit->fresh());
    }

    /**
     * Supprimer une ligne de commande.
     */
    public function destroy(Request $request, CommandeProduit $commandeProduit): JsonResponse
    {
        $this->authorizeOwnerOrAdmin($request, $commandeProduit->commande, 'utilisateur_id');

        DB::transaction(function () use ($commandeProduit) {
            $commande = $commandeProduit->commande;
            $commandeProduit->delete();
            $this->recalculateCommandeTotal($commande);
        });

        return response()->json([
            'message' => 'Produit de commande supprimé avec succès.',
        ]);
    }

    /**
     * Recalcule le prix total d'une commande à partir de ses lignes.
     */
    private function recalculateCommandeTotal(?Commande $commande): void
    {
        if ($commande === null) {
            return;
        }

        $commande->update([
            'prix_total' => (float) $commande->commandeProduits()->sum('total'),
        ]);
    }
}
