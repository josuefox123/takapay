<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationRequest extends FormRequest
{
    /**
     * Le destinataire (marquer comme lue) ou un administrateur peut modifier la notification.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        $notification = $this->route('notification');

        return $notification !== null && (int) $notification->utilisateur_id === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        if (! ($this->user()?->isAdmin() ?? false)) {
            // Le destinataire ne peut que changer le statut de lecture
            return [
                'utilisateur_id' => 'prohibited',
                'cagnotte_id' => 'prohibited',
                'titre' => 'prohibited',
                'message' => 'prohibited',
                'type' => 'prohibited',
                'statut' => ['sometimes', Rule::in(['non_lue', 'lue'])],
            ];
        }

        return [
            'utilisateur_id' => 'sometimes|exists:users,id',
            'cagnotte_id' => 'sometimes|nullable|exists:cagnottes,id',
            'titre' => 'sometimes|string|max:255',
            'message' => 'sometimes|string',
            'type' => 'sometimes|string|max:100',
            'statut' => ['sometimes', Rule::in(['non_lue', 'lue'])],
        ];
    }
}
