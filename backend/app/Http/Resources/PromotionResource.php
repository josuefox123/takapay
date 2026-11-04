<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PromotionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $imageUrl = null;
        if (! empty($this->image_popup)) {
            $imageUrl = str_starts_with($this->image_popup, 'http')
                ? $this->image_popup
                : Storage::disk('public')->url($this->image_popup);
        }

        return [
            'id' => $this->id,
            'admin_id' => $this->admin_id,
            'produit_id' => $this->produit_id,
            'produit' => $this->whenLoaded('produit', fn () => $this->produit ? [
                'id' => $this->produit->id,
                'nom' => $this->produit->nom,
            ] : null),
            'titre' => $this->titre,
            'description' => $this->description,
            'image_popup' => $this->image_popup,
            'image_popup_url' => $imageUrl,
            'afficher_popup' => (bool) $this->afficher_popup,
            'pourcentage_promo' => $this->pourcentage_promo,
            'date_debut' => $this->date_debut,
            'date_fin' => $this->date_fin,
            'statut' => $this->statut,
        ];
    }
}
