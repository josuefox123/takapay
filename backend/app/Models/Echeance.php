<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Echeance extends Model
{
    use HasFactory;

    protected $table = 'echeances';

    protected $fillable = [
        'cagnotte_id',
        'numero',
        'date_prevue',
        'montant_attendu',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'date_prevue' => 'date',
            'montant_attendu' => 'decimal:2',
        ];
    }

    public function cagnotte(): BelongsTo
    {
        return $this->belongsTo(Cagnotte::class, 'cagnotte_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'echeance_id');
    }
}
