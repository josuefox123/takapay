<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    use HasFactory;

    protected $table = 'promotions';

    protected $fillable = [
        'pourcentage_promo',
        'date_debut',
        'date_fin',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'pourcentage_promo' => 'decimal:2',
            'date_debut' => 'datetime',
            'date_fin' => 'datetime',
        ];
    }

    public function parametreProduits(): HasMany
    {
        return $this->hasMany(ParametreProduit::class, 'promotion_id');
    }
}
