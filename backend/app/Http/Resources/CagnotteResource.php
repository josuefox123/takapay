<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CagnotteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'utilisateur_id' => $this->utilisateur_id,
            'produit_id' => $this->produit_id,
            'produit' => new ProduitResource($this->whenLoaded('produit')),
            'utilisateur' => new UserResource($this->whenLoaded('utilisateur')),
            'echeances' => EcheanceResource::collection($this->whenLoaded('echeances')),
            'transactions' => TransactionResource::collection($this->whenLoaded('transactions')),
            'prix_unitaire' => $this->prix_unitaire,
            'montant_verse' => $this->montant_verse,
            'moyen_paiement' => $this->moyen_paiement,
            'statut' => $this->statut,
            'adresse_livraison' => $this->adresse_livraison,
            'telephone_livraison' => $this->telephone_livraison,
            'note_livraison' => $this->note_livraison,
            'coordonnees_gps' => $this->coordonnees_gps,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
