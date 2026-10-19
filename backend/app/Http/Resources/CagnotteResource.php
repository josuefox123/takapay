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
            'produit_id' => $this->produit_id,
            'produit' => new ProduitResource($this->whenLoaded('produit')),
            'echeances' => EcheanceResource::collection($this->whenLoaded('echeances')),
            'transactions' => TransactionResource::collection($this->whenLoaded('transactions')),
            'prix_unitaire' => $this->prix_unitaire,
            'montant_verse' => $this->montant_verse,
            'moyen_paiement' => $this->moyen_paiement,
            'statut' => $this->statut,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
