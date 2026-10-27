<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Commande extends Model
{
    use HasFactory;

    protected $table = 'commandes';

    protected $fillable = [
        'utilisateur_id',
        'reference',
        'statut',
        'prix_total',
    ];

    protected function casts(): array
    {
        return [
            'prix_total' => 'decimal:2',
        ];
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function commandeProduits(): HasMany
    {
        return $this->hasMany(CommandeProduit::class, 'commande_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'commande_id');
    }

    /**
     * Génère une référence lisible si absente.
     */
    public static function genererReference(): string
    {
        return 'CMD-' . strtoupper(uniqid());
    }

    protected static function booted(): void
    {
        static::creating(function (Commande $commande) {
            if (empty($commande->reference)) {
                $commande->reference = self::genererReference();
            }
        });
    }
}
