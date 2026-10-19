<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDocumentRequest extends FormRequest
{
    /**
     * Seul le propriétaire du document ou un administrateur peut le modifier.
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

        $document = $this->route('document');

        return $document !== null && (int) $document->utilisateur_id === (int) $user->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isAdmin = $this->user()?->isAdmin() ?? false;

        return [
            'utilisateur_id' => 'prohibited',
            'type' => 'sometimes|string|max:100',
            'chemin' => 'sometimes|string|max:255',
            'nom_origine' => 'sometimes|string|max:255',
            'type_fichier' => 'sometimes|string|max:100',
            'taille' => 'sometimes|integer|min:0',
            // Vérification du KYC réservée à l'administration
            'statut' => $isAdmin
                ? ['sometimes', Rule::in(['en_attente', 'valide', 'refuse'])]
                : ['prohibited'],
            'date_modification' => 'sometimes|nullable|date',
            'verifier_par' => $isAdmin ? ['sometimes', 'nullable', 'exists:users,id'] : ['prohibited'],
            'motif' => $isAdmin ? ['sometimes', 'nullable', 'string', 'max:500'] : ['prohibited'],
        ];
    }
}
