<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProduitResource extends JsonResource
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
        'sous_categorie_id' => $this->sous_categorie_id,
        'nom' => $this->nom,
        'description' => $this->description,
        'stock' => $this->stock,
        'duree' => $this->duree,
        'couleur' => $this->couleur,
    ];
    }
}
