<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Adresse extends Model
{
    use HasFactory;

    protected $table = 'adresses';

    protected $fillable = [
        'utilisateur_id',
        'description',
        'adresse',
        'quartier',
        'ville',
        'pays',
        'latitude',
        'longitude',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function livraisons(): HasMany
    {
        return $this->hasMany(Livraison::class, 'adresse_id');
    }
}
