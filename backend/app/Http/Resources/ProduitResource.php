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
            'sous_categorie' => new SousCategorieResource($this->whenLoaded('sousCategorie')),
            'parametre_produit' => new ParametreProduitResource($this->whenLoaded('parametreProduit')),
            'image_produits' => ImageProduitResource::collection($this->whenLoaded('imageProduits')),
            'nom' => $this->nom,
            'description' => $this->description,
            'stock' => $this->stock,
            'duree' => $this->duree,
            'couleur' => $this->couleur,
            'video' => $this->video,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
