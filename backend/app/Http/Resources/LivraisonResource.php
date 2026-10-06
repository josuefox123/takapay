<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LivraisonResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cagnotte_id' => $this->cagnotte_id,
            'adresse_id' => $this->adresse_id,
            'livreur_id' => $this->livreur_id,
            'statut' => $this->statut,
            'reference_suivi' => $this->reference_suivi,
            'frais_livraison' => $this->frais_livraison,
            'date_demande' => $this->date_demande,
            'date_prevue' => $this->date_prevue,
            'date_livraison' => $this->date_livraison,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
