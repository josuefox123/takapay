<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Produit extends Model
{
    use HasFactory;

    protected $table = 'produits';

    protected $fillable = [
        'sous_categorie_id',
        'nom',
        'description',
        'stock',
        'duree',
        'couleur',
    ];

    protected function casts(): array
    {
        return [
            'stock' => 'integer',
            'duree' => 'integer',
        ];
    }

    public function sousCategorie(): BelongsTo
    {
        return $this->belongsTo(SousCategorie::class, 'sous_categorie_id');
    }

    public function imageProduits(): HasMany
    {
        return $this->hasMany(ImageProduit::class, 'produit_id');
    }

    public function parametreProduit(): HasOne
    {
        return $this->hasOne(ParametreProduit::class, 'produit_id');
    }

    public function cagnottes(): HasMany
    {
        return $this->hasMany(Cagnotte::class, 'produit_id');
    }

    public function commandeProduits(): HasMany
    {
        return $this->hasMany(CommandeProduit::class, 'produit_id');
    }
}
