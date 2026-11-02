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
        'type_commande',
        'mode_paiement',
        'statut_reception',
        'adresse_livraison',
        'telephone_livraison',
        'note_livraison',
        'coordonnees_gps',
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
     * Résolution de la cagnotte liée par jointure (transactions ou utilisateur_id + produit_id).
     */
    public function getCagnotteAttribute(): ?Cagnotte
    {
        // 1. Via les transactions liées à la commande
        if ($this->relationLoaded('transactions')) {
            $cag = $this->transactions->first(fn ($tx) => $tx->cagnotte !== null)?->cagnotte;
            if ($cag) return $cag;
        }

        // 2. Par jointure sur l'utilisateur et les produits de la commande
        if ($this->utilisateur_id) {
            $produitIds = $this->relationLoaded('commandeProduits')
                ? $this->commandeProduits->pluck('produit_id')->filter()
                : $this->commandeProduits()->pluck('produit_id')->filter();

            if ($produitIds->isNotEmpty()) {
                return Cagnotte::where('utilisateur_id', $this->utilisateur_id)
                    ->whereIn('produit_id', $produitIds)
                    ->latest()
                    ->first();
            }
        }

        return null;
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
