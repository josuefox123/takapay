<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
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
            'cagnotte_id' => $this->cagnotte_id,
            'titre' => $this->titre,
            'message' => $this->message,
            'type' => $this->type,
            'statut' => $this->statut,

        ];
    }
}
