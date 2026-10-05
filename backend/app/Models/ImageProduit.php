<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImageProduit extends Model
{
    use HasFactory;

    protected $table = 'image_produits';

    protected $fillable = [
        'produit_id',
        'chemin',
        'position',
        'is_principal',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_principal' => 'boolean',
        ];
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class, 'produit_id');
    }
}
