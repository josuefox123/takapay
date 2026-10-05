<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParametreProduit extends Model
{
    use HasFactory;

    protected $table = 'parametre_produits';

    protected $fillable = [
        'produit_id',
        'promotion_id',
        'reference',
        'prix_minimum',
        'prix_echelonne',
        'prix_total',
        'mode_paiement',
        'date_echeance',
        'frequence',
        'seuil_livraison',
        'prix_cash',
    ];

    protected function casts(): array
    {
        return [
            'prix_minimum' => 'decimal:2',
            'prix_echelonne' => 'decimal:2',
            'prix_total' => 'decimal:2',
            'seuil_livraison' => 'decimal:2',
            'prix_cash' => 'decimal:2',
            'date_echeance' => 'date',
        ];
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class, 'produit_id');
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class, 'promotion_id');
    }
}
