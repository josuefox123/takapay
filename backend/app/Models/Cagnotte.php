<?php

namespace App\Models;

use App\Mail\CagnottePreteMail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class Cagnotte extends Model
{
    use HasFactory;

    protected $table = 'cagnottes';

    protected $fillable = [
        'utilisateur_id',
        'produit_id',
        'prix_unitaire',
        'montant_verse',
        'montant_objectif',
        'moyen_paiement',
        'statut',
        'adresse_livraison',
        'telephone_livraison',
        'note_livraison',
        'coordonnees_gps',
        'montant_remboursement',
        'frais_annulation',
        'telephone_remboursement',
        'date_demande_annulation',
    ];

    protected function casts(): array
    {
        return [
            'prix_unitaire'           => 'decimal:2',
            'montant_verse'           => 'decimal:2',
            'montant_objectif'        => 'decimal:2',
            'montant_remboursement'   => 'decimal:2',
            'frais_annulation'        => 'decimal:2',
            'date_demande_annulation' => 'datetime',
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

    /**
     * Objectif effectif de la cagnotte.
     * Priorité : montant_objectif explicite → prix_unitaire → prix total produit.
     */
    public function getObjectifEffectifAttribute(): float
    {
        if ($this->montant_objectif !== null && (float) $this->montant_objectif > 0) {
            return (float) $this->montant_objectif;
        }

        if ($this->prix_unitaire !== null && (float) $this->prix_unitaire > 0) {
            return (float) $this->prix_unitaire;
        }

        return (float) ($this->produit?->parametreProduit?->prix_total ?? 0);
    }

    /**
     * Progression en pourcentage (0 à 100).
     */
    public function getProgressionAttribute(): int
    {
        $objectif = $this->objectif_effectif;
        if ($objectif <= 0) {
            return 0;
        }

        return (int) min(100, round((((float) $this->montant_verse) / $objectif) * 100));
    }

    protected static function booted(): void
    {
        static::saved(function (Cagnotte $cagnotte) {
            $objectif = (float) $cagnotte->objectif_effectif;
            $verse = (float) $cagnotte->montant_verse;
            $isCompleted = ($cagnotte->statut === 'terminee') || ($objectif > 0 && $verse >= $objectif);
            $isNotCancelled = !in_array($cagnotte->statut, ['annulee', 'annulation_demandee', 'remboursee', 'echouee']);

            if ($isCompleted && $isNotCancelled && $verse > 0) {
                $cagnotte->sendCagnottePreteNotification();
            }
        });
    }

    /**
     * Envoie la notification et l'email au client lorsque sa cagnotte est prête.
     */
    public function sendCagnottePreteNotification(?string $overrideEmail = null): void
    {
        try {
            $user = $this->utilisateur;
            if (!$user) {
                return;
            }

            // Éviter les envois multiples si déjà notifié pour cette cagnotte
            $alreadyNotified = $this->notifications()
                ->where('titre', 'like', '%Cagnotte prête%')
                ->exists();
            if ($alreadyNotified) {
                return;
            }

            // 1. Notification dans l'espace client
            Notification::create([
                'utilisateur_id' => $user->id,
                'cagnotte_id' => $this->id,
                'titre' => '🎉 Cagnotte prête !',
                'message' => 'Félicitations ! Vos cotisations pour ' . ($this->produit?->nom ?? 'votre article') . ' sont terminées. Un conseiller TakaPay va vous contacter dans moins de 24h pour organiser votre livraison.',
                'type' => 'infos',
            ]);

            // 2. Envoi de l'email au client
            $targetEmail = null;
            if (!empty($overrideEmail) && filter_var($overrideEmail, FILTER_VALIDATE_EMAIL) && !str_ends_with($overrideEmail, '@client.takapay.bj')) {
                $targetEmail = $overrideEmail;
                if (empty($user->email) || str_ends_with($user->email, '@client.takapay.bj')) {
                    $user->update(['email' => $overrideEmail]);
                }
            } elseif (!empty($user->email) && !str_ends_with($user->email, '@client.takapay.bj') && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                $targetEmail = $user->email;
            }

            if ($targetEmail) {
                Mail::to($targetEmail)->send(new CagnottePreteMail($this, $user));
                Log::info('Email "Cagnotte prête" envoyé à ' . $targetEmail . ' (cagnotte #' . $this->id . ')');
            } else {
                Log::warning('Notification "Cagnotte prête" créée mais aucun email valide pour utilisateur #' . $user->id);
            }
        } catch (\Throwable $e) {
            Log::error('Erreur lors de l\'envoi de la notification "Cagnotte prête" : ' . $e->getMessage());
        }
    }
}
