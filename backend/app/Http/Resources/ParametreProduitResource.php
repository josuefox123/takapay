<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ParametreProduitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'produit_id' => $this->produit_id,
            'promotion_id' => $this->promotion_id,
            'reference' => $this->reference,
            'prix_minimum' => $this->prix_minimum,
            'prix_echelonne' => $this->prix_echelonne,
            'prix_total' => $this->prix_total,
            'mode_paiement' => $this->mode_paiement,
            'date_echeance' => $this->date_echeance,
            'frequence' => $this->frequence,
            'seuil_livraison' => $this->seuil_livraison,
            'prix_cash' => $this->prix_cash,
        ];
    }
}
