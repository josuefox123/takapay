<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SousCategorieResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rawImage = $this->image;
        $url = $rawImage;

        if ($rawImage && ! str_starts_with($rawImage, 'http://') && ! str_starts_with($rawImage, 'https://') && ! str_starts_with($rawImage, 'data:')) {
            $cleaned = ltrim(preg_replace('#^/?storage/#', '', $rawImage), '/');
            if (str_starts_with($cleaned, 'assets/')) {
                $url = asset($cleaned);
            } elseif (
                str_starts_with($cleaned, 'sous_categories/')
                || str_starts_with($cleaned, 'categories/')
                || str_contains($cleaned, '/')
            ) {
                $url = asset('storage/'.$cleaned);
            } else {
                $url = asset('storage/sous_categories/'.$cleaned);
            }
        }

        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'image' => $url,
            'nom_fichier' => $rawImage ? basename($rawImage) : null,
            'categorie_id' => $this->categorie_id,
            'categorie' => new CategorieResource($this->whenLoaded('categorie')),
        ];
    }
}
