<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAuditRequest extends FormRequest
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
        'utilisateur_id'  => 'sometimes|nullable|exists:users,id',
        'action'          => 'sometimes|string|max:255',
        'table_cible'     => 'sometimes|string|max:255',
        'record_id'       => 'sometimes|integer',
        'ancienne_valeur' => 'sometimes|nullable',
        'nouvelle_valeur' => 'sometimes|nullable',
        'ip_address'      => 'sometimes|nullable|ip',
        'user_agent'      => 'sometimes|nullable|string',
    ];
}
}
