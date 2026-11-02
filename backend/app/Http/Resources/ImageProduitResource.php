<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ImageProduitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rawChemin = $this->chemin;
        $url = $rawChemin;

        if ($rawChemin && ! str_starts_with($rawChemin, 'http://') && ! str_starts_with($rawChemin, 'https://') && ! str_starts_with($rawChemin, 'data:')) {
            $cleaned = ltrim($rawChemin, '/');
            if (Storage::disk('public')->exists('produits/'.$cleaned)) {
                $url = asset('storage/produits/'.$cleaned);
            } elseif (Storage::disk('public')->exists($cleaned)) {
                $url = asset('storage/'.$cleaned);
            } elseif (str_starts_with($cleaned, 'assets/')) {
                $url = asset($cleaned);
            } else {
                $url = asset('storage/produits/'.$cleaned);
            }
        }

        return [
            'id' => $this->id,
            'produit_id' => $this->produit_id,
            'chemin' => $rawChemin, // nom de l'image tel quel en base de données (ex: telephone.jpeg)
            'url' => $url,         // URL exploitable directement dans les balises <img src="...">
            'nom_fichier' => $rawChemin ? basename($rawChemin) : null,
            'position' => (int) $this->position,
            'is_principal' => (bool) $this->is_principal,
        ];
    }
}
