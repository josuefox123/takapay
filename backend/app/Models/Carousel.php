<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Carousel extends Model
{
    use HasFactory;

    protected $table = 'carousels';

    protected $fillable = [
        'titre',
        'description',
        'kicker',
        'image',
        'texte_bouton',
        'lien',
        'produit_id',
        'ordre',
        'is_actif',
    ];

    protected $casts = [
        'is_actif' => 'boolean',
        'ordre' => 'integer',
        'produit_id' => 'integer',
    ];

    protected $appends = [
        'image_url',
    ];

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class, 'produit_id');
    }

    public function getImageUrlAttribute(): string
    {
        if (empty($this->image)) {
            return '';
        }

        if (str_starts_with($this->image, 'http://') || str_starts_with($this->image, 'https://')) {
            return $this->image;
        }

        if (str_starts_with($this->image, '/')) {
            return url($this->image);
        }

        return asset('storage/' . ltrim($this->image, '/'));
    }
}
