<?php

namespace App\Http\Requests;


use Illuminate\Foundation\Http\FormRequest;

class StoreNotificationRequest extends FormRequest
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
           'utilisateur_id' => 'required|exists:users,id',
            'cagnotte_id' => 'nullable|exists:cagnottes,id',
            'titre' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|string|max:100',
            'statut' => 'required|string|max:50',
        ];
    }
}
