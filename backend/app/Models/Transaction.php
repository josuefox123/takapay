<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    protected $table = 'transactions';

    protected $fillable = [
        'cagnotte_id',
        'echeance_id',
        'reference_externe',
        'date',
        'statut',
        'montant',
        'prestataire',
        'type',
        'moyen_paiement',
        'devise',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'datetime',
            'montant' => 'decimal:2',
        ];
    }

    public function cagnotte(): BelongsTo
    {
        return $this->belongsTo(Cagnotte::class, 'cagnotte_id');
    }

    public function echeance(): BelongsTo
    {
        return $this->belongsTo(Echeance::class, 'echeance_id');
    }
}
