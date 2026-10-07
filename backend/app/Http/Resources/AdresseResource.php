<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdresseResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' =>$this->id,
            'utilisateur_id' =>$this->utilisateur_id,
            'description' =>$this->description,
            'adresse' =>$this->adresse,
            'quartier' =>$this->quartier,
            'ville' =>$this->ville,
            'pays' =>$this->pays,
            'latitude' =>$this->latitude,
            'longitude' =>$this->longitude,

        ];


    }
}
