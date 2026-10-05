<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Livreur extends Model
{
    use HasFactory;

    protected $table = 'livreurs';

    protected $fillable = [
        'utilisateur_id',
        'type_vehicule',
        'statut',
    ];

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function livraisons(): HasMany
    {
        return $this->hasMany(Livraison::class, 'livreur_id');
    }
}
