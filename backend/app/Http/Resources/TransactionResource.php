<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_externe' => $this->reference_externe,
            'date' => $this->date,
            'statut' => $this->statut,
            'montant' => $this->montant,
            'prestataire' => $this->prestataire,
            'type' => $this->type,
            'moyen_paiement' => $this->moyen_paiement,
            'devise' => $this->devise,
            'cagnotte_id' => $this->cagnotte_id,
            'echeance_id' => $this->echeance_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
