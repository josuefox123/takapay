<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Audit extends Model
{
    use HasFactory;

    protected $table = 'audits';

    protected $fillable = [
        'utilisateur_id',
        'action',
        'table_cible',
        'record_id',
        'ancienne_valeur',
        'nouvelle_valeur',
        'ip_address',
        'user_agent',
    ];

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }
}
