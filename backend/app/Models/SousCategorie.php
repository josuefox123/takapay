<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SousCategorie extends Model
{
    use HasFactory;

    protected $table = 'sous_categories';

    protected $fillable = [
        'nom',
        'categorie_id',
    ];

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(Categorie::class, 'categorie_id');
    }

    public function produits(): HasMany
    {
        return $this->hasMany(Produit::class, 'sous_categorie_id');
    }
}
