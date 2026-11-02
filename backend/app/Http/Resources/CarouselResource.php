<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CarouselResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'titre' => $this->titre,
            'description' => $this->description,
            'kicker' => $this->kicker,
            'image' => $this->image,
            'image_url' => $this->image_url,
            'texte_bouton' => $this->texte_bouton,
            'lien' => $this->lien,
            'produit_id' => $this->produit_id,
            'produit' => $this->whenLoaded('produit', function () {
                return $this->produit ? [
                    'id' => $this->produit->id,
                    'nom' => $this->produit->nom,
                ] : null;
            }),
            'ordre' => (int) $this->ordre,
            'is_actif' => (bool) $this->is_actif,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
