<?php

namespace App\Http\Requests;


use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

        public function rules(): array
    {
        return [
            //
            'utilisateur_id' => 'sometimes|exists:users,id',
            'cagnotte_id' => 'sometimes|nullable|exists:cagnottes,id',
            'titre' => 'sometimes|string|max:255',
            'message' => 'sometimes|string',
            'type' => 'sometimes|string|max:100',
            'statut' => 'sometimes|string|max:50',
        ];
    }
}
