<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    /**
     * Un client dépose ses propres documents ; un administrateur peut en déposer pour un autre.
     * Le propriétaire est forcé côté contrôleur pour un non-admin.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
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
            // Un non-admin ne peut déposer que pour lui-même
            'utilisateur_id' => $isAdmin
                ? ['sometimes', 'exists:users,id']
                : ['sometimes', Rule::in([(string) $this->user()?->id])],
            'type' => 'required|string|max:100',
            'chemin' => 'required|string|max:255',
            'nom_origine' => 'required|string|max:255',
            'type_fichier' => 'required|string|max:100',
            'taille' => 'required|integer|min:0',
            // Le statut KYC ne se forge pas soi-même : seul l'admin vérifie
            'statut' => $isAdmin
                ? ['sometimes', Rule::in(['en_attente', 'valide', 'refuse'])]
                : ['prohibited'],
            'date_modification' => 'nullable|date',
            'verifier_par' => $isAdmin ? ['nullable', 'exists:users,id'] : ['prohibited'],
            'motif' => $isAdmin ? ['nullable', 'string', 'max:500'] : ['prohibited'],
        ];
    }
}
