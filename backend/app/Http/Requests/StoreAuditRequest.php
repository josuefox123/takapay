<?php

namespace App\Http\Requests;


use Illuminate\Foundation\Http\FormRequest;

class StoreAuditRequest extends FormRequest
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
     
     */
    public function rules(): array
    {
        return [
            'utilisateur_id' => 'nullable|exists:users,id',
            'action' => 'required|string|max:255',
            'table_cible' => 'required|string|max:255',
            'record_id' => 'required|integer',
            'ancienne_valeur' => 'nullable',
            'nouvelle_valeur' => 'nullable',
            'ip_address' => 'nullable|ip',
            'user_agent' => 'nullable|string',
        ];
    }
}
