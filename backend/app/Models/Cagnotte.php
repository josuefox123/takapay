<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cagnotte extends Model
{
    use HasFactory;

    protected $table = 'cagnottes';

    protected $fillable = [
        'utilisateur_id',
        'produit_id',
        'prix_unitaire',
        'montant_verse',
        'moyen_paiement',
        'statut',
        'adresse_livraison',
        'telephone_livraison',
        'note_livraison',
        'coordonnees_gps',
    ];

    protected function casts(): array
    {
        return [
            'prix_unitaire' => 'decimal:2',
            'montant_verse' => 'decimal:2',
        ];
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class, 'produit_id');
    }

    public function echeances(): HasMany
    {
        return $this->hasMany(Echeance::class, 'cagnotte_id');
    }

    public function livraisons(): HasMany
    {
        return $this->hasMany(Livraison::class, 'cagnotte_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'cagnotte_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'cagnotte_id');
    }
}
