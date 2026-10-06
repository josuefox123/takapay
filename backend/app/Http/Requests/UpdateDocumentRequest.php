<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            //
            'utilisateur_id' => 'sometimes|exists:users,id',
            'type' => 'sometimes|string|max:100',
            'chemin' => 'sometimes|string|max:255',
            'nom_origine' => 'sometimes|string|max:255',
            'type_fichier' => 'sometimes|string|max:100',
            'taille' => 'sometimes|integer|min:0',
            'statut' => 'sometimes|string|max:50',
            'date_modification' => 'sometimes|nullable|date',
            'verifier_par' => 'sometimes|nullable|exists:users,id',
            'motif' => 'sometimes|nullable|string',
        ];
    }
}
