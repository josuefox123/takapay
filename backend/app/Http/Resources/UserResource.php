<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'email' => $this->email,
            'telephone' => $this->telephone,
            'photo_profil' => $this->photo_profil,
            'role' => $this->role,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'statut_compte' => $this->statut_compte,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
