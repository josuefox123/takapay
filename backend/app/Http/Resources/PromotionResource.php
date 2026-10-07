<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PromotionResource extends JsonResource
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
            'pourcentage_promo' => $this->pourcentage_promo,
            'date_debut' => $this->date_debut,
            'date_fin' => $this->date_fin,
            'statut' => $this->statut,
        ];
    }
}
