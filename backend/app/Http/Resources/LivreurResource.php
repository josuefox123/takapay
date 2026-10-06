<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LivreurResource extends JsonResource
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
            'utilisateur_id' => $this->utilisateur_id,
            'type_vehicule' => $this->type_vehicule,
            'statut' => $this->statut,

        ];

    }
}
