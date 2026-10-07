<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ImageProduitResource extends JsonResource
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
            'chemin' => $this->chemin,
            'position' => $this->position,
            'is_principal' => $this->is_principal,
        ];
    }
}
