<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    use HasFactory;

    protected $table = 'promotions';

    protected $fillable = [
        'admin_id',
        'produit_id',
        'titre',
        'description',
        'image_popup',
        'afficher_popup',
        'pourcentage_promo',
        'date_debut',
        'date_fin',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'pourcentage_promo' => 'decimal:2',
            'afficher_popup' => 'boolean',
            'date_debut' => 'datetime',
            'date_fin' => 'datetime',
        ];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class, 'produit_id');
    }

    public function parametreProduits(): HasMany
    {
        return $this->hasMany(ParametreProduit::class, 'promotion_id');
    }
}
