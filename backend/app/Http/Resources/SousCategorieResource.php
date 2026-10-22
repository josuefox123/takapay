<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class SousCategorieResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rawImage = $this->image;
        $url = $rawImage;

        if ($rawImage && ! str_starts_with($rawImage, 'http://') && ! str_starts_with($rawImage, 'https://') && ! str_starts_with($rawImage, 'data:')) {
            $cleaned = ltrim($rawImage, '/');
            if (Storage::disk('public')->exists('sous_categories/'.$cleaned)) {
                $url = asset('storage/sous_categories/'.$cleaned);
            } elseif (Storage::disk('public')->exists('categories/'.$cleaned)) {
                $url = asset('storage/categories/'.$cleaned);
            } elseif (Storage::disk('public')->exists($cleaned)) {
                $url = asset('storage/'.$cleaned);
            } elseif (str_starts_with($cleaned, 'assets/')) {
                $url = asset($cleaned);
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
        ];
    }
}
