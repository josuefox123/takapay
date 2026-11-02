<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
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
            'utilisateur_id' => $this->utilisateur_id,
            'utilisateur' => new UserResource($this->whenLoaded('utilisateur')),
            'type' => $this->type,
            'chemin' => $this->chemin,
            'nom_origine' => $this->nom_origine,
            'type_fichier' => $this->type_fichier,
            'taille' => $this->taille,
            'statut' => $this->statut,
            'date_modification' => $this->date_modification,
            'verifier_par' => $this->verifier_par,
            'verificateur' => new UserResource($this->whenLoaded('verificateur')),
            'motif' => $this->motif,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
